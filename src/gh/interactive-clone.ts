import { Octokit } from "@octokit/rest";
import chalk from "chalk";
import { promisify } from "node:util";
import { Result, ok, err } from "../pattern.js";
import { cloningOptions, partialCloningOptions } from "../constants.js";
import {
  runNormalClone,
  runShallowClone,
  runTreelessClone,
  runBloblessClone,
  runSparseCheckout,
} from "../cloning.js";
import {
  displayRepoInfo,
  getHeaderText,
  promptInput,
  promptSelection,
  renderFolderContents,
  ChoiceItem,
} from "../ui.js";
import { sanitizeDirectoryName, sanitizeSearchTerm } from "../sanitize.js";
import {
  searchRepositories,
  promptRepoSelection,
  promptFolderSelection,
  GitHubRepo,
} from "./api.js";

const sleep = promisify(setTimeout);

/**
 * Executes authenticated interactive clone workflow for GitHub repositories.
 */
async function authenticatedInteractiveClone(
  octokit: Octokit,
): Promise<Result<void, string>> {
  console.log(getHeaderText());

  const rawSearchTerm = await promptInput(
    chalk.greenBright("Enter the term to search repositories: "),
  );
  const sanitizedSearch = sanitizeSearchTerm(rawSearchTerm);
  if (!sanitizedSearch.ok) {
    return err(sanitizedSearch.error);
  }

  const searchResult = await searchRepositories(octokit, sanitizedSearch.value);
  if (!searchResult.ok) {
    return err(searchResult.error);
  }

  const repos = searchResult.value.items;
  if (repos.length === 0) {
    console.log(chalk.red("0 Repositories found! Nothing to show."));
    return ok(undefined);
  }

  const selectedRepo = await promptRepoSelection(repos);
  displayRepoInfo(selectedRepo);

  const cloneChoices: Array<ChoiceItem<string>> = cloningOptions.map((opt) => ({
    name: opt.name,
    value: opt.value,
    description: opt.description,
  }));

  const cloningPreference = await promptSelection(
    cloneChoices,
    "Choose your preferred way to clone the repository",
  );

  if (cloningPreference === "partial") {
    const partialChoices: Array<ChoiceItem<string>> = partialCloningOptions.map(
      (opt) => ({
        name: opt.name,
        value: opt.value,
        description: opt.description,
      }),
    );

    const partialPreference = await promptSelection(
      partialChoices,
      "Choose your preferred way to partially clone the repository",
    );

    if (partialPreference === "shallow") {
      await runShallowClone(selectedRepo.html_url);
    } else if (partialPreference === "treeless") {
      await runTreelessClone(selectedRepo.html_url);
    } else if (partialPreference === "blobless") {
      await runBloblessClone(selectedRepo.html_url);
    } else if (partialPreference === "sparse") {
      const rootFolderResult = await promptFolderSelection(
        octokit,
        selectedRepo.full_name,
        "",
      );

      if (!rootFolderResult.ok) {
        return err(rootFolderResult.error);
      }

      let selectedFolder = rootFolderResult.value;
      if (!selectedFolder) {
        console.log(chalk.red("No folders found in repository root."));
        return ok(undefined);
      }

      const confirmRoot = await promptInput(
        chalk.greenBright(`Partially clone "${selectedFolder}"? [Y/N] `),
      );

      if (confirmRoot.trim().toLowerCase() === "y") {
        await runSparseCheckout(selectedRepo.html_url, "", "", selectedFolder, true);
        return ok(undefined);
      }

      // Enter subdirectory navigation loop
      await sleep(1000);
      console.log("Entering directory navigation...");

      while (selectedFolder) {
        await sleep(1000);
        const subFolderResult = await promptFolderSelection(
          octokit,
          selectedRepo.full_name,
          selectedFolder,
        );

        if (!subFolderResult.ok) {
          console.error(chalk.red(subFolderResult.error));
          break;
        }

        const nextFolder = subFolderResult.value;
        if (nextFolder) {
          console.log(`Path to selected folder: ${chalk.cyan(nextFolder)}`);
          const confirmSub = await promptInput(
            chalk.greenBright(`Partially clone "${nextFolder}"? [Y/N] `),
          );
          if (confirmSub.trim().toLowerCase() === "y") {
            await runSparseCheckout(selectedRepo.html_url, "", "", nextFolder, true);
            return ok(undefined);
          }
          selectedFolder = nextFolder;
        } else {
          console.log(chalk.yellow("No folders found further down."));
          const fallbackConfirm = await promptInput(
            chalk.greenBright(
              `Clone the last selected folder ("${selectedFolder}")? [Y/N] `,
            ),
          );
          if (fallbackConfirm.trim().toLowerCase() === "y") {
            await runSparseCheckout(selectedRepo.html_url, "", "", selectedFolder, true);
          }
          break;
        }
      }
    }
  } else {
    await runNormalClone(selectedRepo.html_url);
  }

  return ok(undefined);
}

/**
 * Executes unauthenticated interactive clone for GitHub repositories (legacy support with sanitization).
 */
async function unauthenticatedInteractiveClone(): Promise<Result<void, string>> {
  console.log(getHeaderText());

  const rawSearch = await promptInput(
    chalk.greenBright("Enter the term to search repositories: "),
  );
  const sanitizedSearch = sanitizeSearchTerm(rawSearch);
  if (!sanitizedSearch.ok) {
    return err(sanitizedSearch.error);
  }

  try {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(sanitizedSearch.value)}`,
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
          Accept: "application/vnd.github+json",
        },
      },
    );

    if (!response.ok) {
      return err(`GitHub API request failed with status: ${response.status}`);
    }

    const data = (await response.json()) as { items?: GitHubRepo[] };
    const repos = data.items || [];
    if (repos.length === 0) {
      console.log(chalk.red("0 Repositories found! Nothing to show."));
      return ok(undefined);
    }

    const selectedRepo = await promptRepoSelection(repos);
    displayRepoInfo(selectedRepo);

    const viewContents = await promptInput(
      `${chalk.greenBright("View the repository contents?")} (${chalk.green("y")}/${chalk.red("n")}) [default=${chalk.red("n")}] `,
    );

    if (viewContents.trim().toLowerCase() === "y") {
      const contentsResponse = await fetch(
        `https://api.github.com/repos/${selectedRepo.full_name}/contents`,
        {
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            Accept: "application/vnd.github+json",
          },
        },
      );
      if (contentsResponse.ok) {
        const contents = (await contentsResponse.json()) as Array<{
          name: string;
          type: string;
        }>;
        console.log(chalk.greenBright(`Contents of ${selectedRepo.full_name}:\n`));
        renderFolderContents(contents);
      } else {
        console.log(chalk.yellow(`Could not fetch contents (status: ${contentsResponse.status}).`));
      }
    }

    const doClone = await promptInput(
      `${chalk.greenBright("Clone the repository?")} (${chalk.green("y")}/${chalk.red("n")}) [default=${chalk.red("n")}] `,
    );

    if (doClone.trim().toLowerCase() === "y") {
      const specificDir = await promptInput(
        `${chalk.greenBright("Clone into a specific directory?")} (${chalk.green("y")}/${chalk.red("n")}) [default=${chalk.red("n")}] `,
      );

      let targetDir = "";
      if (specificDir.trim().toLowerCase() === "y") {
        const dirInput = await promptInput(
          chalk.greenBright("Enter the directory name for cloning -> "),
        );
        const sanitizedDir = sanitizeDirectoryName(dirInput);
        if (!sanitizedDir.ok) {
          return err(sanitizedDir.error);
        }
        targetDir = sanitizedDir.value;
      }

      console.log(chalk.bgMagentaBright.black(" Cloning Initiated!\n"));
      await runNormalClone(selectedRepo.html_url, targetDir);
    }

    return ok(undefined);
  } catch (error) {
    return err(
      `Unauthenticated clone failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export { authenticatedInteractiveClone, unauthenticatedInteractiveClone };
