const { getVerifiedAuthToken, checkTokenValidity } = await import("./getAuthenticated.js");
const { Octokit } = await import("@octokit/rest");
const { saveToken, getStoredToken, getStoredAuthType, clearToken } = await import("./tokenHelpers.js");
import config from "./config.js";

const authLoginInteractive = async () => {
  console.log("Choose your preferred way to authenticate\n\t 1. Browser Login with passcode, 2. personal access token");
  console.log("Enter 1 to begin Browser Login, otherwise token authentication will be initiated");

  const { default:input } = await import("../utils/input.js");
  const choice = await input("Enter your choice ->");

  try {
    const numberChoice = Number(choice);

    if (numberChoice === 1) {
      return await authLogin("oauth");
    } else if (isNaN(numberChoice)) {
      console.error("Invalid Input: Auth aborted!");
      process.exit(1);
    } else {
      return await authLogin("token");
    }

  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  
}

const authLogin = async (authType) => {
  const tokenData =
    authType === "oauth"
      ? await getVerifiedAuthToken("oauth")
      : await getVerifiedAuthToken();
  saveToken(tokenData, config.TOKEN_FILE);
  const octokit = new Octokit({ auth: tokenData.token });
  return octokit;
};

const revokeToken = async () => {
  try {
    const { default:input } = await import("../utils/input.js");
    const { default:chalk } = await import("chalk");
    const yesOrNo = await input(chalk.red("Are you sure you want to revoke the token? [y/N]"));
    if (yesOrNo.toLowerCase() !== "y") {
      console.log("Token revocation aborted.");
      return;
    }
    const { Octokit } = await import("@octokit/rest");
    const tokenFilePath = config.TOKEN_FILE;
    const storedToken = getStoredToken(tokenFilePath);

    if (!storedToken) {
      console.error("Error: Token not found.");
      console.error("You are not authenticated.");
      return;
    }

    const isValid = await checkTokenValidity(storedToken);
    if (!isValid) {
      console.log("Token is already expired. No need to revoke.");
      clearToken(tokenFilePath);
      return;
    }

    const authType = getStoredAuthType(tokenFilePath);
    if (authType !== "oauth") {
      console.log("Token type is not OAuth. Skipping revocation.");
      return;
    }

    const octokit = new Octokit({ auth: storedToken });

    // Attempt to revoke the token
    await octokit.rest.apps.deleteToken({
      client_id: config.CLIENT_ID,
      access_token: storedToken,
    });
    console.log("Token revoked successfully!");

    clearToken(tokenFilePath);
  } catch (error) {
    console.error("An error occurred while revoking the token:", error.message);
    process.exit(1);
  }
};

const refreshToken = async () => {
  try {
    const { Octokit } = await import("@octokit/rest");
    const tokenFilePath = config.TOKEN_FILE;
    const storedToken = getStoredToken(tokenFilePath);
    if (!storedToken) {
      console.error("Error: Token not found.");
      console.error("You are not authenticated.");
      return;
    }

    const isValid = await checkTokenValidity(storedToken);
    if (!isValid) {
      console.log("Token is already expired/invalid. Can't refresh.");
      return;
    }

    const authType = getStoredAuthType(tokenFilePath);
    if (authType !== "oauth") {
      console.log("Token type is not OAuth. Skipping refresh.");
      return;
    }

    const octokit = new Octokit({ auth: storedToken });

    // Attempt to refresh the token
    const { token: newToken } = await octokit.request(
      `PATCH /applications/${config.CLIENT_ID}/token`,
      {
        client_id: config.CLIENT_ID,
        access_token: storedToken,
        headers: {
          accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    console.log("Token refreshed successfully!");
    saveToken({ token: newToken, type: "oauth" }, tokenFilePath);
  } catch (error) {
    console.error(
      "An error occurred while refreshing the token:",
      error.message,
    );
    process.exit(1);
  }
};

export { authLoginInteractive, authLogin, checkTokenValidity, revokeToken, refreshToken };
