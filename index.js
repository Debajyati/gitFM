#!/usr/bin/env node
import axios from "axios";
import inquirer from "inquirer";
import chalk from "chalk";
import PrettyError from "pretty-error";
import { exec } from "node:child_process";

const pe = new PrettyError();
pe.appendStyle({
  // Selector to the element that says `Error`
  "pretty-error > header > title > kind": {
    // we hide the title that says `Error`:
    display: "none",
  },

  // Selector to the 'colon' after 'Error':
  "pretty-error > header > colon": {
    // we hide that too:
    display: "none",
  },
  // our error message
  "pretty-error > header > message": {
    color: "bright-white",
    background: "cyan",
    padding: "0 1",
  },
  // each trace item ...
  "pretty-error > trace > item": {
    // ... can have a margin ...
    marginLeft: 2,

    // ... and a bullet character!
    bullet: '"<grey>o</grey>"',
  },
  "pretty-error > trace > item > header > pointer > file": {
    color: "bright-cyan",
  },

  "pretty-error > trace > item > header > pointer > line": {
    color: "bright-cyan",
  },
});
// pe.start();

// Fetch repositories based on the search term
async function fetchRepos (searchTerm) {
  try {
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=${searchTerm}`,
    );
    return {
      entries: response.data.items,
      length: response.data.total_count,
    };
  } catch (error) {
    console.log(
      chalk.bgBlueBright("Unexpected Error occured while fetching repos..."),
    );
    process.exit(1);
  }
}

// Render a single repository
function renderRepo(repo) {
  const { name, description, html_url } = repo;
  console.log(
    chalk.bgYellow(chalk.black("repo name :")),
    "\t",
    chalk.cyanBright(name),
    "\n",
  );
  console.log(
    chalk.bgBlueBright(chalk.black("Description :")),
    "\t",
    chalk.bold(description),
    "\n",
  );
  console.log(
    chalk.bgGreen(chalk.black("URL :")),
    "\t",
    chalk.yellow(chalk.underline(html_url)),
    "\n",
  );
}

// Prompt the user to select a repository from the list
async function promptRepoSelection(repos) {
  const choices = repos.map((repo) => ({ name: repo.full_name, value: repo }));
  return await inquirer.prompt([
    {
      type: "rawlist",
      name: "selectedRepo",
      message: "Select a repository:",
      loop: false,
      choices,
    },
  ]);
}

// Fetch the contents of the selected repository as an object
// When response statusText is 'OK', the content object will be `fetchRepoContentsResponse().data`
// If response status code is >= 400, the `fetchRepoContentsResponse().data` will be error.response.data
async function fetchRepoContentsResponse(repoFullName) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoFullName}/contents`,
    );
    if (response.statusText === "OK") {
      return {
        data: response.data,
        status: Number(response.status),
      };
    }
  } catch (error) {
    console.log(
      chalk.bgRedBright(chalk.black(`${error.response.data.message}\n`)),
    );
    return {
      data: error.response.data,
      status: Number(error.response.status),
    };
  }
}

// Render the repository contents as a folder structure
function renderRepoContents(contents, indent = "  ") {
  try {
    contents.forEach((item) => {
      if (item.type === "dir") {
        console.log(
          `${indent}`,
          chalk.bgCyanBright(chalk.black(`${item.name}`)),
          chalk.blueBright("/"),
        );
        /* axios.get(item.url).then((response) => {
          renderRepoContents(response.data, indent + "  ");
        }); */
      } else {
        console.log(`${indent}${item.name}`);
      }
    });
  } catch (error) {
    console.error(
      chalk.bgBlue("Unexpected Error occured while rendering contents"),
    );
  }
}

const main = async () => {
  // Prompt the user for a search term
  const promptUser = await inquirer.prompt([
    {
      type: "input",
      name: "searchTerm",
      message: chalk.cyan("Enter the search term:"),
    },
  ]);
  /* function input(query) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) => {
      rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  } 

  const searchTerm = await input('Enter the search term:'); */
  const userInput = promptUser.searchTerm;

  const repos = await fetchRepos(userInput);

  if (repos.length < 1) {
    console.log(`${chalk.red(`${repos.length} Repositories found!`)} `);
    console.log("Nothing to show");
    process.exit(1);
  }
  const { selectedRepo } = await promptRepoSelection(repos.entries);
  renderRepo(selectedRepo);
  
  const askUser = await inquirer.prompt([
    {
      type: "input",
      name: "want",
      message: `${chalk.cyan(`view the repository contents?`)} (${chalk.green('y')}/${chalk.red('n')}) [default=${chalk.red('n')}] `,
    },
  ]);
  if (askUser.want === "yes" || askUser.want === "y" || askUser.want === "Y") {
    const repoContentsResponse = await fetchRepoContentsResponse(
      selectedRepo.full_name,
    );
    if (repoContentsResponse.status < 400) {
      console.log(chalk.green(`Contents of ${selectedRepo.full_name}:\n`));
      renderRepoContents(repoContentsResponse.data);
    } else {
      console.log(
        `request returned ${repoContentsResponse.status} status response.\n`,
      );
    }
  }
  const askAgain = await inquirer.prompt([
    {
      type: "input",
      name: "want",
      message: `${chalk.cyan(`clone the repository?`)} (${chalk.green('y')}/${chalk.red('n')}) [default=${chalk.red('n')}] `,
    },
  ]);
  if (
    askAgain.want === "yes" ||
    askAgain.want === "y" ||
    askAgain.want === "Y"
  ) {
    const lastQuestion = await inquirer.prompt([
      {
        type: "input",
        name: "choice",
        message: `${chalk.cyan('clone into a specific directory?')} (${chalk.green('y')}/${chalk.red('n')}) [default=${chalk.red('n')}] `,
      },
    ]);
    if (
      lastQuestion.choice === "yes" ||
      lastQuestion.choice === "Y" ||
      lastQuestion.choice === "y"
    ) {
      const directoryName = await inquirer.prompt([
        {
          type: "input",
          name: "input",
          message:
            chalk.cyan(`Enter the directory for cloning ${chalk.yellow('(WARNING: directory must NOT ALREADY exist!)')} -> `),
        },
      ]);
      console.log(chalk.bgMagentaBright(chalk.black("Cloning Initaited!\n")));
      exec(
        `git clone https://github.com/${selectedRepo.full_name}.git ${directoryName.input}`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(pe.render(error));
            process.exit(1);
          }
          console.log(stdout);
          console.log(stderr);
        },
      );
    } else {
      console.log(chalk.bgMagentaBright(chalk.black("Cloning Initaited!\n")));
      exec(
        `git clone https://github.com/${selectedRepo.full_name}.git`,
        (error, stdout, stderr) => {
          if (error) {
            console.log(pe.render(error));
            process.exit(1);
          }
          console.log(stdout);
          console.log(stderr);
        },
      );
    }
  }
};

export {
  fetchRepos,
  fetchRepoContentsResponse,
  renderRepo,
  renderRepoContents,
}

main();
