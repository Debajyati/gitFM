const { promisify } = await import("node:util");
const sleep = promisify(setTimeout);
const cloningOptions = [
  {
    name: "Normal Cloning",
    value: "normal",
    description: "Clones the entire repository, including all branches and history.",
  },
  {
    name: "Partial Cloning",
    value: "partial",
    description: "Clones only specific parts of the repository, such as a single branch or a subset of files.",
  }
];

const partialCloningOptions = [
  {
    name: "Shallow Cloning",
    value: "shallow",
    description: "shallow clone only the latest commit",
  },
  {
    name: "Sparse Cloning",
    value: "sparse",
    description: "clone only a specific folder",
  },
  {
    name: "Blobless Cloning",
    value: "blobless",
    description: "clones the repository without downloading the actual file contents (blobs). You only need the repository history",
  }
];

import {
  runShallowClone,
  runSparseCheckout,
  runBloblessClone,
  normalClone,
} from "../../../../cloning.js";

import {
  fetchRepos,
  promptRepoSelection,
  promptFolderSelectionFromSubFolder,
  promptFolderSelectionFromRoot,
  getCurrentRateLimits,
  repoInfo,
} from "./requests.js";
import input from "../input.js";
import search from "@inquirer/search";
import chalk from "chalk";
import { headerText } from "../headerText.js";

const interactiveClone = async (octokit) => {
  console.log(headerText);

  const searchTerm = await input(chalk.greenBright("Enter the term to search repositories: "));
  const repos = (await getCurrentRateLimits(octokit)).search.remaining > 0 ? await fetchRepos(octokit, searchTerm) : '';

  if ( typeof(repos) === 'string' ) {
    console.log(
      chalk.yellow(
        "\nYou ran out of search queries!\nTry again after some minutes!!\n",
      ),
    );
    console.log(
      `Visit - https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api to learn more about GitHub API rate limits`,
    );
    process.exit(1);
  }
  
  if (repos.length < 1) {
    console.log(`${chalk.red(`${repos.length} Repositories found!`)} `);
    console.log("Nothing to show");
    process.exit(1);
  }
  const selectedRepo = await promptRepoSelection(repos.items);
  await repoInfo(selectedRepo);

  const cloningPreference = await search({
    message: "Choose your prefered way to clone the repository",
    source: async (_input, { signal }) => {
      if (signal.aborted) {
        console.log(chalk.yellow("Aborted!"));
        process.exit(1);
      }
      return cloningOptions;
    },
  });

  if (cloningPreference === "partial") {
    const partialCloningPreference = await search({
      message: "Choose your preferred way to partially clone the repository",
      source: async (input, { signal }) => {
        if (signal.aborted) {
          console.log(chalk.yellow("Aborted!"));
          process.exit(1);
        }
        if (!input) {
          return partialCloningOptions;
        } else {
          const filteredChoices = partialCloningOptions.filter((choice) => choice.name.includes(input));
          return filteredChoices;
        }
      },
    });

    if (partialCloningPreference === "shallow") {
      await runShallowClone(selectedRepo.html_url);
    } else if (partialCloningPreference === "sparse") {
      let selectedFolder = await promptFolderSelectionFromRoot(octokit, selectedRepo.full_name); // yes I've changed this to let from const
      if (selectedFolder === null) {
        console.log(`${chalk.red(`${selectedFolder.length} Folders found!`)} `);
        console.log("Exiting...");
        process.exit(0);
      }

      const yesOrNo = await input(chalk.greenBright("Partially clone this selected folder? [Y/N]"));
      if (yesOrNo.toLowerCase() === "y") {
        await runSparseCheckout(selectedRepo.html_url, '', '', selectedFolder);
      } else {
        await sleep(1000);
        console.log('Entering into this directory');
        let pathToNextFolder;
        while (pathToNextFolder !== "" || pathToNextFolder !== null) {
          try {
            await sleep(2000);
            pathToNextFolder = (await promptFolderSelectionFromSubFolder(octokit, selectedRepo.full_name, selectedFolder)) || "";
            if (pathToNextFolder) {
              console.log('path to selected Folder is -> ' + pathToNextFolder);
              const yesOrNo = await input(chalk.greenBright("Partially clone this selected folder? [Y/N]"));
              if (yesOrNo.toLowerCase() === "y") {
                await runSparseCheckout(selectedRepo.html_url, '', '', pathToNextFolder);
                break;
              } else {
                selectedFolder = pathToNextFolder;
              }
            } else {
              console.log('No folders found further down');
              const yesOrNo = await input(chalk.greenBright("Still don't want to partially clone last selected folder? [Y/N]"));
              if (yesOrNo.toLowerCase() === "y") {
                await runSparseCheckout(selectedRepo.html_url, '', '', selectedFolder);
                break;
              } else {
                console.log('Exiting...');
                process.exit(0);
              }
            }
          } catch (error) {
            console.error(error.message);
            process.exit(1); 
          }
        }
      }
    } else {
      await runBloblessClone(selectedRepo.html_url);
    }
  } else {
    await normalClone(selectedRepo.html_url);
  }
}

export { interactiveClone };
