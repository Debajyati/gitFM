import { promisify } from "node:util";
import { type as osType } from "node:os";
import open, { apps } from "open";
import { createDeviceCode, exchangeDeviceCode } from "@octokit/oauth-methods";
import { Octokit } from "@octokit/rest";
import chalk from "chalk";
import { Result, ok, err } from "../pattern.js";
import { getStoredToken, saveToken, clearToken } from "../token-storage.js";
import { promptInput } from "../ui.js";
import { GITHUB_CONFIG } from "./config.js";

const sleep = promisify(setTimeout);

/**
 * Executes GitHub OAuth Device Flow, opening the browser and polling for token.
 */
async function authenticateWithDeviceFlow(): Promise<Result<string, string>> {
  try {
    const {
      data: { device_code, user_code, verification_uri, interval },
    } = await createDeviceCode({
      clientType: "oauth-app",
      clientId: GITHUB_CONFIG.CLIENT_ID,
      scopes: [...GITHUB_CONFIG.SCOPES],
    });

    console.log(`\nYour OAuth User Code is - \n\t${chalk.bold.cyan(user_code)}\n`);
    console.log("Opening the Browser Window to Enter the User Code...");
    console.log("Waiting for the user to grant access through the browser...\n");

    try {
      if (osType() === "Windows_NT") {
        await open(verification_uri, {
          wait: true,
          app: { name: apps.browser },
        });
      } else {
        await open(verification_uri, { wait: true });
      }
    } catch (openError) {
      console.error(
        "Error opening browser:",
        openError instanceof Error ? openError.message : String(openError),
      );
      console.log("Please manually open the following URL in your browser:");
      console.log(chalk.underline.blue(verification_uri));
      await sleep(3000);
    }

    let currentInterval = interval;
    let remainingAttempts = 150;

    while (remainingAttempts > 0) {
      remainingAttempts -= 1;
      try {
        const response = await exchangeDeviceCode({
          clientType: "oauth-app",
          clientId: GITHUB_CONFIG.CLIENT_ID,
          code: device_code,
        });
        return ok(response.authentication.token);
      } catch (pollError: unknown) {
        const httpError = pollError as {
          status?: number;
          response?: { data?: { error?: string } };
          message?: string;
        };

        if (httpError.status === 400 && httpError.response?.data?.error) {
          const errorCode = httpError.response.data.error;

          if (errorCode === "authorization_pending") {
            console.log("Authorization still pending... waiting before retrying");
            await sleep(currentInterval * 1000);
          } else if (errorCode === "slow_down") {
            console.log("Received slow_down response, increasing interval");
            currentInterval += 5;
            await sleep(currentInterval * 1000);
          } else if (errorCode === "expired_token") {
            return err("The device code has expired. Please start the process again.");
          } else if (errorCode === "incorrect_device_code") {
            return err("The device code provided is not valid.");
          } else if (errorCode === "access_denied") {
            return err("User has denied the request. The authorization process has been canceled.");
          } else {
            return err(`Unexpected OAuth error: ${errorCode}`);
          }
        } else {
          return err(
            httpError.message || "An unexpected error occurred during device flow.",
          );
        }
      }
    }

    return err("Request timeout: User took too long to respond in browser.");
  } catch (error) {
    return err(
      `Device flow initiation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Prompts user for a GitHub Personal Access Token and verifies it.
 */
async function authenticateWithToken(): Promise<Result<string, string>> {
  console.log("Create a new personal access token from your GitHub Developer Settings.");
  console.log(`Select the required scopes: \n\t${chalk.yellow(GITHUB_CONFIG.SCOPES.join(", "))}`);

  const rawToken = await promptInput("Enter the personal access token: ");
  const validationResult = await checkTokenValidity(rawToken);
  if (!validationResult.ok) {
    return err(`Invalid personal access token: ${validationResult.error}`);
  }

  return ok(rawToken);
}

/**
 * Checks if a GitHub token is valid by attempting to fetch the authenticated user profile.
 */
async function checkTokenValidity(token: string): Promise<Result<string, string>> {
  try {
    const octokit = new Octokit({ auth: token });
    const response = await octokit.rest.users.getAuthenticated();
    if (response.data.login) {
      return ok(response.data.login);
    }
    return err("Unable to determine authenticated user.");
  } catch (error: unknown) {
    const httpError = error as { status?: number; message?: string };
    if (httpError.status && httpError.status >= 401) {
      return err("Token is invalid or expired.");
    }
    return err(httpError.message || "Failed to verify token.");
  }
}

/**
 * Interactively prompts the user to select authentication method (Web OAuth vs Personal Access Token).
 */
async function promptInteractiveAuth(): Promise<Result<string, string>> {
  console.log("Choose your preferred way to authenticate:");
  console.log("  1. Browser Login with passcode (OAuth Device Flow)");
  console.log("  2. Personal Access Token (PAT)");

  const choice = await promptInput("Enter your choice (1 or 2) -> ");
  const trimmed = choice.trim();

  if (trimmed === "1") {
    return authenticateWithDeviceFlow();
  }
  if (trimmed === "2") {
    return authenticateWithToken();
  }
  return err(`Invalid selection: "${trimmed}". Expected 1 or 2.`);
}

/**
 * High-level login helper: resolves existing valid token or prompts for authentication.
 */
async function login(
  authType?: "oauth" | "token",
): Promise<Result<Octokit, string>> {
  console.log("Checking if already authorized...");

  const storedTokenResult = getStoredToken(GITHUB_CONFIG.TOKEN_FILE);
  const storedToken = storedTokenResult.ok ? storedTokenResult.value : null;

  if (storedToken) {
    const validityResult = await checkTokenValidity(storedToken);
    if (validityResult.ok) {
      console.log(chalk.greenBright(`User is already authorized as @${validityResult.value}!\n`));
      return ok(new Octokit({ auth: storedToken }));
    }
    console.error(chalk.yellow("\nStored token is invalid or expired. Initiating re-authorization...\n"));
    clearToken(GITHUB_CONFIG.TOKEN_FILE);
  }

  let authResult: Result<string, string>;
  let selectedType = authType || "oauth";

  if (authType === "oauth") {
    authResult = await authenticateWithDeviceFlow();
  } else if (authType === "token") {
    authResult = await authenticateWithToken();
  } else {
    authResult = await promptInteractiveAuth();
    selectedType = "token"; // will store as token/oauth
  }

  if (!authResult.ok) {
    return err(authResult.error);
  }

  const token = authResult.value;
  const saveResult = saveToken({ token, type: selectedType }, GITHUB_CONFIG.TOKEN_FILE);
  if (!saveResult.ok) {
    console.warn(chalk.yellow(`Warning: Could not persist token to disk: ${saveResult.error}`));
  }

  console.log(chalk.greenBright("GitHub authorization successful!\n"));
  return ok(new Octokit({ auth: token }));
}

export {
  authenticateWithDeviceFlow,
  authenticateWithToken,
  checkTokenValidity,
  promptInteractiveAuth,
  login,
};
