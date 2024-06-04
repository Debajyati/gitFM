#!/usr/bin/env node

import axios from "axios";
import inquirer from "inquirer";
import chalk from "chalk";
import PrettyError from "pretty-error";
import { exec as execute } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execute);

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

// Prompt the user for a search term
const promptUser = async () => {
  return await inquirer.prompt([
    {
      type: "input",
      name: "searchTerm",
      message: "Enter the search term:",
    },
  ]);
};

// Fetch repositories based on the search term
const fetchRepos = async (searchTerm) => {
  try {
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=${searchTerm}`,
    );
    return response.data.items;
  } catch (error) {
    console.error(chalk.bgBlueBright("Error fetching repos:"));
    process.exit(1);
  }
};

// Render a single repository
const renderRepo = (repo) => {
  const { name, description, html_url } = repo;
  console.log(chalk.blue(name));
  console.log(chalk.white("Description:"), description);
  console.log(chalk.bgGreen("URL:"), chalk.yellow(html_url));
  console.log();
};

// Prompt the user to select a repository from the list
const promptRepoSelection = async (repos) => {
  const choices = repos.map((repo) => ({ name: repo.full_name, value: repo }));
  return await inquirer.prompt([
    {
      type: "list",
      name: "selectedRepo",
      message: "Select a repository:",
      choices,
    },
  ]);
};

// Fetch the contents of the selected repository
const fetchRepoContents = async (repoFullName) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoFullName}/contents`,
    );
    return response.data;
  } catch (error) {
    console.log("Error fetching repo contents:", pe.render(error));
    process.exit(1);
  }
};

// Render the repository contents as a folder structure
const renderRepoContents = (contents, indent = "") => {
  try {
    contents.forEach((item) => {
      if (item.type === "dir") {
        console.log(chalk.blue(`${indent}${item.name}/`));
        axios.get(item.url).then((response) => {
          renderRepoContents(response.data, indent + "  ");
        });
      } else {
        console.log(`${indent}${item.name}`);
      }
    });
  } catch (error) {
    console.error(
      chalk.bgBlue("Unexpected Error occured while rendering contents"),
    );
    console.log(pe.render(error));
  }
};

const main = async () => {
  const userInput = await promptUser();
  const repos = await fetchRepos(userInput.searchTerm);

  const { selectedRepo } = await promptRepoSelection(repos);
  console.log(chalk.magentaBright(`${selectedRepo.full_name}:-`));
  renderRepo(selectedRepo);
  const askUser = await inquirer.prompt([
    {
      type: "input",
      name: "want",
      message: "view the repository contents? (y/n)\t"
    },
  ]);
  if (askUser.want === "yes" || askUser.want === "y" || askUser.want === "Y") {
    const repoContents = await fetchRepoContents(selectedRepo.full_name);
    console.log(chalk.green(`Contents of ${selectedRepo.full_name}:`));
    renderRepoContents(repoContents);
  } 
  const askAgain = await inquirer.prompt([
    {
      type: "input",
      name: "want",
      message: "clone the repository? (y/n)\t"
    }
  ]);
  if (askAgain.want === "yes" || askAgain.want === "y" || askAgain.want === "Y") {
    const lastQuestion = await inquirer.prompt([{
      type: "input",
      name: "choice",
      message: "clone into a specific directory? (y/n)\t"
    }]);
    if (lastQuestion.choice === "yes" || lastQuestion.choice === "Y" || lastQuestion.choice === "y") {
      const directoryName = await inquirer.prompt([
        {
          type:"input",
          name:"input",
          message:"Enter the directory for cloning ->\t"
        }
      ])
      console.log(chalk.bgMagentaBright("Cloning Initaited!\n"));
      const {error, stdout, stderr} = await exec(`git clone https://github.com/${selectedRepo.full_name}.git ${directoryName.input}`);
      if (error) {
        console.error(pe.render(error));
        process.exit(1);
      }
      console.log("STDOUT :-", stdout);
      console.log("STDERR :-", stderr);
    } else {
      console.log(chalk.bgMagentaBright("Cloning Initaited!\n"));
      const {error, stdout, stderr} = await exec(`git clone https://github.com/${selectedRepo}.git`);
      if (error) {
        console.error(pe.render(error));
      }
      console.log("STDOUT :-", stdout);
      console.log("STDERR :-", stderr);
    }
  }
};

main();
