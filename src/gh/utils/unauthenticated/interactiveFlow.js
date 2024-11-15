import input from "../input.js";
import chalk from "chalk";
import { exec } from "node:child_process";
import { headerText } from "../headerText.js";
import {
  fetchRepos,
  fetchRepoContentsResponse,
  renderRepoContents,
  repoInfo,
  promptRepoSelection,
} from "./repo.js";

async function unAuthenticatedInteractiveFlow() {
  console.log(headerText);

  // Prompt the user for a search term
  const searchTerm = await input(chalk.greenBright("Enter the term to search repositories: "));
  const repos = await fetchRepos(searchTerm);

  if (repos.length < 1) {
    console.log(`${chalk.red(`${repos.length} Repositories found!`)} `);
    console.log("Nothing to show");
    process.exit(1);
  }
  const selectedRepo = await promptRepoSelection(repos.entries);
  repoInfo(selectedRepo);

  let userInput = await input(`${chalk.greenBright(`view the repository contents?`)} (${chalk.green("y")}/${chalk.red("n")}) [default=${chalk.red("n")}] `);
  
  if (userInput === "yes" || userInput === "y" || userInput === "Y") {
    const repoContentsResponse = await fetchRepoContentsResponse(
      selectedRepo.full_name,
    );
    if (repoContentsResponse.status < 400) {
      console.log(chalk.greenBright(`Contents of ${selectedRepo.full_name}:\n`));
      renderRepoContents(repoContentsResponse.data);
    } else {
      console.log(
        `request returned ${repoContentsResponse.status} status response.\n`,
      );
    }
  }
  userInput = await input(`${chalk.greenBright(`clone the repository?`)} (${chalk.green("y")}/${chalk.red("n")}) [default=${chalk.red("n")}] `);

  if (userInput === "yes" || userInput === "y" || userInput === "Y") {
    userInput = await input(`${chalk.greenBright("clone into a specific directory?")} (${chalk.green("y")}/${chalk.red("n")}) [default=${chalk.red("n")}] `);

    if (userInput === "yes" || userInput === "Y" || userInput === "y") {
      const directoryName = await input(
        chalk.greenBright(`Enter the directory for cloning${chalk.yellow("(WARNING: directory must NOT ALREADY exist!)")}->`),
      );

      console.log(chalk.bgMagentaBright(chalk.black("Cloning Initaited!\n")));

      exec(
        `git clone https://github.com/${selectedRepo.full_name}.git ${directoryName}`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(chalk.red(error));
            console.log(chalk.red(stderr));
            process.exit(1);
          }
          console.log(`${stdout}\n`);
          console.log("Cloning Completed Succesfully!!!");
        },
      );
    } else {
      console.log(chalk.bgMagentaBright(chalk.black("Cloning Initaited!\n")));
      exec(
        `git clone https://github.com/${selectedRepo.full_name}.git`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(chalk.red(error));
            console.log(chalk.red(stderr));
            process.exit(1);
          } else {
            console.log(stdout);
          }
        },
      );
    }
  }
}

export { unAuthenticatedInteractiveFlow };
