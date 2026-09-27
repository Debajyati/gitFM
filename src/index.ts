#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Command } from "commander";
import chalk from "chalk";
import { getHeaderText, promptInput } from "./ui.js";
import {
  validateGitUrl,
  sanitizeDirectoryName,
  sanitizeBranchName,
  sanitizeConeMode,
  sanitizeExpiryDate,
} from "./sanitize.js";
import {
  runNormalClone,
  runShallowClone,
  runBloblessClone,
  runTreelessClone,
  runSparseCheckout,
} from "./cloning.js";
import { login } from "./gh/auth.js";
import {
  displayUserProfile,
  searchRepositories,
  fetchStarredRepositories,
  GitHubRepo,
} from "./gh/api.js";
import {
  authenticatedInteractiveClone,
  unauthenticatedInteractiveClone,
} from "./gh/interactive-clone.js";
import { GITLAB_CONFIG } from "./gl/config.js";
import {
  checkTokenIsValid,
  revokeToken,
  rotateToken,
} from "./gl/api.js";
import { interactiveGitLabClone } from "./gl/interactive-clone.js";
import { getStoredToken, saveToken, clearToken } from "./token-storage.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
) as { name: string; description: string; version: string };

const program = new Command();

program.addHelpText("beforeAll", getHeaderText());

program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version);

// ----------------------
// Command: gh
// ----------------------
program
  .command("gh")
  .description("authorize gitfm with your GitHub")
  .option(
    "--auth [TYPE]",
    "Choose your preferred way to log in. Valid arguments: web, token. (Interactive if omitted)",
  )
  .option("--profile", "get a minimal overview of your GitHub profile")
  .action(async (options: { auth?: string | boolean; profile?: boolean }) => {
    try {
      if (options.profile) {
        const loginResult = await login();
        if (!loginResult.ok) {
          console.error(chalk.red(loginResult.error));
          process.exit(1);
        }
        const profileResult = await displayUserProfile(loginResult.value);
        if (!profileResult.ok) {
          console.error(chalk.red(profileResult.error));
          process.exit(1);
        }
      } else {
        const authType =
          options.auth === "token"
            ? "token"
            : options.auth === "web"
              ? "oauth"
              : undefined;
        const loginResult = await login(authType);
        if (!loginResult.ok) {
          console.error(chalk.red(loginResult.error));
          process.exit(1);
        }
      }
    } catch (error) {
      console.error(
        chalk.red(`Error in gh command: ${error instanceof Error ? error.message : String(error)}`),
      );
      process.exit(1);
    }
  });

// ----------------------
// Command: gl
// ----------------------
program
  .command("gl")
  .description("authorize or unauthorize gitfm with your GitLab")
  .option("--login", "login with a personal access token")
  .option("--logout", "logout and revoke the token")
  .option(
    "--rotate <EXPIRY_DATE>",
    "rotate the personal access token with an Expiry Date (YYYY-MM-DD format)",
  )
  .action(
    async (options: {
      login?: boolean;
      logout?: boolean;
      rotate?: string;
    }) => {
      try {
        if (options.logout) {
          const storedTokenResult = getStoredToken(GITLAB_CONFIG.TOKEN_FILE);
          const storedToken = storedTokenResult.ok ? storedTokenResult.value : null;

          if (!storedToken) {
            console.error(chalk.red("Can't Logout: Not currently Authenticated!"));
            process.exit(1);
          }

          const revokeResult = await revokeToken(storedToken);
          if (!revokeResult.ok) {
            console.error(chalk.red(`Logout failed: ${revokeResult.error}`));
            process.exit(1);
          }

          clearToken(GITLAB_CONFIG.TOKEN_FILE, null);
          console.log(chalk.greenBright("Token successfully revoked and cleared!"));
        } else if (options.login) {
          const storedTokenResult = getStoredToken(GITLAB_CONFIG.TOKEN_FILE);
          const storedToken = storedTokenResult.ok ? storedTokenResult.value : null;

          if (storedToken) {
            console.log("A token is already stored. Checking validity...");
            const validityResult = await checkTokenIsValid(storedToken);
            if (validityResult.ok) {
              console.log(chalk.greenBright("Stored token is valid!"));
              return;
            }
            console.error(chalk.yellow("Stored token is invalid or expired. Prompting for new token..."));
          }

          console.log("Create a new personal access token from your GitLab profile.");
          console.log("Ensure you choose the 'api' scope.");
          const rawToken = await promptInput("Enter the token here: ");
          const checkResult = await checkTokenIsValid(rawToken);
          if (!checkResult.ok) {
            console.error(chalk.red(`Authentication failed: ${checkResult.error}`));
            process.exit(1);
          }

          saveToken({ token: checkResult.value }, GITLAB_CONFIG.TOKEN_FILE);
          console.log(chalk.greenBright("GitLab token saved successfully!"));
        } else if (options.rotate) {
          const dateValidation = sanitizeExpiryDate(options.rotate);
          if (!dateValidation.ok) {
            console.error(chalk.red(dateValidation.error));
            process.exit(1);
          }

          const storedTokenResult = getStoredToken(GITLAB_CONFIG.TOKEN_FILE);
          const storedToken = storedTokenResult.ok ? storedTokenResult.value : null;

          if (!storedToken) {
            console.error(chalk.red("Cannot rotate: No stored GitLab token found. Please login first."));
            process.exit(1);
          }

          const rotateResult = await rotateToken(storedToken, dateValidation.value);
          if (!rotateResult.ok) {
            console.error(chalk.red(`Token rotation failed: ${rotateResult.error}`));
            process.exit(1);
          }

          saveToken({ token: rotateResult.value }, GITLAB_CONFIG.TOKEN_FILE);
          console.log(chalk.greenBright("Token rotated and updated successfully!"));
        } else {
          console.log("No option specified for gl command. Run `gitfm gl --help` for usage.");
        }
      } catch (error) {
        console.error(
          chalk.red(`Error in gl command: ${error instanceof Error ? error.message : String(error)}`),
        );
        process.exit(1);
      }
    },
  );

// ----------------------
// Command: icl
// ----------------------
program
  .command("icl")
  .description("interactively clone a GitHub or GitLab repository")
  .option(
    "-u, --unauthenticated",
    "legacy version of the GitHub repo interactive clone (unauthenticated)",
  )
  .option("--gh", "clone a GitHub repository")
  .option("--gl", "clone a GitLab repository")
  .action(
    async (options: {
      unauthenticated?: boolean;
      u?: boolean;
      gh?: boolean;
      gl?: boolean;
    }) => {
      try {
        if (options.unauthenticated || options.u) {
          const result = await unauthenticatedInteractiveClone();
          if (!result.ok) {
            console.error(chalk.red(result.error));
            process.exit(1);
          }
        } else if (options.gh) {
          const loginResult = await login();
          if (!loginResult.ok) {
            console.error(chalk.red(loginResult.error));
            process.exit(1);
          }
          const cloneResult = await authenticatedInteractiveClone(loginResult.value);
          if (!cloneResult.ok) {
            console.error(chalk.red(cloneResult.error));
            process.exit(1);
          }
        } else if (options.gl) {
          const storedTokenResult = getStoredToken(GITLAB_CONFIG.TOKEN_FILE);
          let token = storedTokenResult.ok ? storedTokenResult.value : null;

          if (!token) {
            console.log(chalk.yellow("No stored GitLab token found. Please enter one:"));
            const rawToken = await promptInput("GitLab Personal Access Token: ");
            const validityResult = await checkTokenIsValid(rawToken);
            if (!validityResult.ok) {
              console.error(chalk.red(`Invalid token: ${validityResult.error}`));
              process.exit(1);
            }
            saveToken({ token: validityResult.value }, GITLAB_CONFIG.TOKEN_FILE);
            token = validityResult.value;
          }

          const cloneResult = await interactiveGitLabClone(token);
          if (!cloneResult.ok) {
            console.error(chalk.red(cloneResult.error));
            process.exit(1);
          }
        } else {
          console.log("Please specify a platform: --gh, --gl, or --unauthenticated.");
        }
      } catch (error) {
        console.error(
          chalk.red(`Error in icl command: ${error instanceof Error ? error.message : String(error)}`),
        );
        process.exit(1);
      }
    },
  );

// ----------------------
// Command: clone
// ----------------------
program
  .command("clone <REPO_URL> [DIRNAME] [BRANCHNAME] [CONE_MODE]")
  .usage("<REPO_URL> [DIRNAME] [BRANCHNAME] [CONE_MODE] [options]")
  .summary("clone any remote repository using the URL. Run `gitfm clone --help` for details.")
  .description(
    "Clone any remote git repository using the URL. <REPO_URL> is mandatory. " +
      "[DIRNAME] and [BRANCHNAME] are optional. [CONE_MODE] can be cone or nocone (default: nocone).",
  )
  .option(
    "--sparse <PATH_TO_DIRECTORY...>",
    "clone only the specified directory(ies) or file(s) of the repository (sparse checkout)",
  )
  .option("--shallow", "shallow clone only the latest commit of the repository")
  .option("--blobless", "run a blobless clone of the repository")
  .option("--treeless", "run a treeless clone of the repository")
  .action(
    async (
      rawRepoUrl: string,
      rawDirName: string | undefined,
      rawBranchName: string | undefined,
      rawConeMode: string | undefined,
      options: {
        sparse?: string[];
        shallow?: boolean;
        blobless?: boolean;
        treeless?: boolean;
      },
    ) => {
      const urlResult = validateGitUrl(rawRepoUrl);
      if (!urlResult.ok) {
        console.error(chalk.red(urlResult.error));
        process.exit(1);
      }
      const repoUrl = urlResult.value;

      const dirResult = sanitizeDirectoryName(rawDirName || "");
      if (!dirResult.ok) {
        console.error(chalk.red(dirResult.error));
        process.exit(1);
      }
      const dirName = dirResult.value;

      const branchResult = sanitizeBranchName(rawBranchName || "");
      if (!branchResult.ok) {
        console.error(chalk.red(branchResult.error));
        process.exit(1);
      }
      const branchName = branchResult.value;

      const coneResult = sanitizeConeMode(rawConeMode);
      if (!coneResult.ok) {
        console.error(chalk.red(coneResult.error));
        process.exit(1);
      }
      const noCone = coneResult.value === "nocone";

      try {
        if (options.sparse) {
          await runSparseCheckout(repoUrl, dirName, branchName, options.sparse, noCone);
        } else if (options.shallow) {
          await runShallowClone(repoUrl, dirName, branchName);
        } else if (options.blobless) {
          await runBloblessClone(repoUrl, dirName, branchName);
        } else if (options.treeless) {
          await runTreelessClone(repoUrl, dirName, branchName);
        } else {
          await runNormalClone(repoUrl, dirName, branchName);
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Error during clone command: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        process.exit(1);
      }
    },
  );

// ----------------------
// Command: ghs
// ----------------------
program
  .command("ghs [TERM]")
  .description("get a tabular list of GitHub repositories matching the given search term")
  .option("--me", "show only repositories owned by the current user")
  .option("-p, --private", "show only private repositories owned by the current user")
  .option("-s, --starred", "show only starred repositories")
  .option("-u, --user <USER>", "show only repositories owned by the given user")
  .option("-l, --language <LANGUAGE>", "show only repositories written in the given language")
  .option("-t, --topic", "show only repositories with the given topic")
  .option("-r, --readme", "show only repositories with terms matching in the README")
  .action(
    async (
      term: string | undefined,
      options: {
        me?: boolean;
        private?: boolean;
        starred?: boolean;
        user?: string;
        language?: string;
        topic?: boolean;
        readme?: boolean;
      },
    ) => {
      const formatRepoTable = (repos: GitHubRepo[]) => {
        if (!repos || repos.length === 0) {
          console.error(chalk.yellow("No repositories found!"));
          return;
        }
        const mapped = repos.map((repo) => {
          let desc = repo.description || "";
          if (desc.length > 175) {
            desc = desc.substring(0, 175) + "...";
          }
          return {
            name: repo.full_name,
            url: repo.html_url,
            description: desc,
          };
        });
        console.table(mapped, ["name", "description"]);
      };

      if ((options.topic || options.readme) && (!term || !term.trim())) {
        console.error(
          chalk.red("A search term is required when using --topic or --readme!"),
        );
        process.exit(1);
      }

      const hasFilter =
        options.me ||
        options.user ||
        options.private ||
        options.starred ||
        options.language ||
        (term && term.trim());

      if (!hasFilter) {
        console.error(
          chalk.red(
            "No search term or filter provided! Run `gitfm ghs --help` for available options.",
          ),
        );
        process.exit(1);
      }

      try {
        const loginResult = await login();
        if (!loginResult.ok) {
          console.error(chalk.red(loginResult.error));
          process.exit(1);
        }
        const octokit = loginResult.value;

        if (options.starred) {
          const starredResult = await fetchStarredRepositories(octokit);
          if (!starredResult.ok) {
            console.error(chalk.red(starredResult.error));
            process.exit(1);
          }
          let items = starredResult.value.items;
          if (options.language) {
            const langFilter = options.language.trim().toLowerCase();
            items = items.filter(
              (r) =>
                typeof r["language"] === "string" &&
                (r["language"] as string).toLowerCase() === langFilter,
            );
          }
          formatRepoTable(items);
          return;
        }

        const queryParts: string[] = [];

        if (term && term.trim()) {
          const cleanTerm = term.trim();
          if (options.readme) {
            queryParts.push(`${cleanTerm} in:readme`);
          } else if (options.topic) {
            queryParts.push(`${cleanTerm} in:topics`);
          } else {
            queryParts.push(cleanTerm);
          }
        }

        if (options.me) {
          const userResponse = await octokit.rest.users.getAuthenticated();
          queryParts.push(`user:${userResponse.data.login}`);
        } else if (options.user) {
          queryParts.push(`user:${options.user.trim()}`);
        }

        if (options.private) {
          queryParts.push("is:private");
        }

        if (options.language) {
          queryParts.push(`language:${options.language.trim()}`);
        }

        const searchQuery = queryParts.join(" ");

        const searchResult = await searchRepositories(octokit, searchQuery);
        if (!searchResult.ok) {
          console.error(chalk.red(searchResult.error));
          process.exit(1);
        }
        formatRepoTable(searchResult.value.items);
      } catch (error) {
        console.error(
          chalk.red(`Error during ghs command: ${error instanceof Error ? error.message : String(error)}`),
        );
        process.exit(1);
      }
    },
  );

program.parseAsync();
