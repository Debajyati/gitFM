import axios from "axios";
import search from "@inquirer/search";
import chalk from "chalk";

async function getCurrentRateLimitsData() {
  const rateLimits = await axios.get("https://api.github.com/rate_limit", {
    headers: { "X-GitHub-Api-Version": "2022-11-28", "Accept": "application/vnd.github+json" },
  });

  return rateLimits.data.resources;
}

// Fetch repositories based on the search term
async function fetchRepos(searchTerm) {
  try {
    const rateLimitsData = await getCurrentRateLimitsData();
    const searchRequestsRemaining = Number(rateLimitsData.search.remaining);
    if (searchRequestsRemaining > 0) {
      const response = await axios.get(
        `https://api.github.com/search/repositories?q=${searchTerm}`, {
          headers: { "X-GitHub-Api-Version": "2022-11-28", "Accept": "application/vnd.github+json" },
        });
      return {
        entries: response.data.items,
        length: response.data.total_count,
      };
    } else {
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
  } catch (err) {
    console.log("\n", err.message, "\n");
    process.exit(1);
  }
}

// Show Info of a single repository
function repoInfo(repo) {
  const { name, description, html_url } = repo;
  console.log('');
  console.log(
    chalk.bgGreenBright(chalk.black("repo name :")),
    "\t",
    chalk.bold(name),
    "\n",
  );
  console.log(
    chalk.bgGreenBright(chalk.black("Description :")),
    "\t",
    chalk.bold(description),
    "\n",
  );
  console.log(
    chalk.bgGreenBright(chalk.black("URL :")),
    "\t",
    chalk.bold(chalk.underline(html_url)),
    "\n",
  );
}

function mapRepos(repos) {
  return repos.map((repo) => ({
    name: repo.full_name,
    value: repo,
    description: repo.description,
  }));
}

// Prompt the user to select a repository from the list with Autocomplete
async function promptRepoSelection(repos) {
  const choices = mapRepos(repos);
  try {
    return await search({
      message: `${chalk.greenBright("Select a repository: ")}${chalk.yellow("(Autocomplete Available)")}`,
      source: async (input, { signal }) => {
        if (signal.aborted) {
          console.log(chalk.yellow("Aborted!"));
          process.exit(1);
        }
        if (!input) {
          return choices;
        } else {
          const filteredChoices = choices.filter((choice) =>
            choice.name.includes(input),
          );
          return filteredChoices;
        }
      },
    });
  } catch (_) {
    console.log(chalk.yellow("Aborted! Exiting Gracefully..."));
    process.exit(1);
  }
}

// Fetch the contents of the selected repository as an object
// When response statusText is 'OK', the content object will be `fetchRepoContentsResponse().data`
// If response status code is >= 400, the `fetchRepoContentsResponse().data` will be error.response.data
async function fetchRepoContentsResponse(repoFullName) {
  try {
    const rateLimits = await getCurrentRateLimitsData();
    const coreRequestsRemaining = Number(rateLimits.core.remaining);

    if (coreRequestsRemaining > 0) {
      const response = await axios.get(
        `https://api.github.com/repos/${repoFullName}/contents`,
      );
      if (response.statusText === "OK") {
        return {
          data: response.data,
          status: Number(response.status),
        };
      }
    } else {
      console.log(
        chalk.yellow(
          `\nYou ran out of request limits!\nTry again after some minutes!!\n`,
        ),
      );
    }
  } catch (error) {
    console.error(error.response.data.message,'\n');
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

export {
  fetchRepos,
  fetchRepoContentsResponse,
  repoInfo,
  promptRepoSelection,
  renderRepoContents,
};
