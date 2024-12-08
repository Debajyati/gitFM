import chalk from "chalk";
import { config } from "./config.js";
const { TOKEN_FILE:CONFIG_FILE } = config;

const baseURL = "https://gitlab.com/api/v4";

const checkTokenIsValid = async (token) => {
  const url = `${baseURL}/personal_access_tokens`;

  try {
    const response = await fetch(url,{
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });

    if (response.status === 401) {
      console.error("invalid access token: Aborted!");
      process.exit(1);
    } else {
      console.log("Authentication Successful");
      return token;
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

async function revokeToken(token) {
  const url = `${baseURL}/personal_access_tokens/self`;
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });

    if (response.status === 204) {
      return "successful";
    } else if (response.status === 400) {
      return "unsuccessful";
    } else if (response.status === 401) {
      return "invalid";
    }
  } catch (error) {
    console.error("Fetch Error");
    console.log(error);
  }
}

async function rotateToken(token, expirationDate) {
  const url = `${baseURL}/personal_access_tokens/self/rotate`;

  try {
    const response = await fetch(
      `${url}?${new URLSearchParams({ expires_at: expirationDate }).toString()}`,
      {
        method: "POST",
        headers: {
          "PRIVATE-TOKEN": token,
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      console.log("Token Rotated Successfully!");
      return data.token;
    } else {
      if (response.status === 400) {
        console.error("Not Rotated Successfully");
        process.exit(1);
      } else if (response.status === 401) {
        console.error("Either The Token Has Expired Or Has Been Revoked Already");
        process.exit(1);
      } else if (response.status === 403) {
        console.error("The Token Is Not Allowed To Rotate Itself");
        process.exit(1);
      } else if (response.status === 405) {
        console.error("The Token Is Not A Personal Access Token");
        process.exit(1);
      } else {
        console.error(`Unknown Status ${response.status} Error Occurred!`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("Fetch Error");
    console.log(error);
  }
}

async function getProjects(token, searchTerm) {
  const url = `${baseURL}/search?scope=projects&search=${searchTerm}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });

    if (response.ok) {
      const data = await response.json();

      const projectsList = data.map((project) => ({
        name: project.path_with_namespace,
        description: project.description,
        url: project.http_url_to_repo,
        projectID: project.id,
      }));

      return projectsList;
    } else {
      console.error(response.statusText);
      console.error(`Request Returned Status ${response.status} Error`);
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

async function getSingleProject(token, id, recursive=false) {
  const url = `${baseURL}/projects/${id}/repository/tree?recursive=${recursive}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error(response.statusText);
      console.error(`Request Returned Status ${response.status} Error`);
      process.exit(1);
    }
  } catch (error) {
    console.error("Fetch Error!");
    console.log(error);
  }
}

async function listRepoBranches(token, id) {
  const url = `${baseURL}/projects/${id}/repository/branches`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });

    if (response.ok) {
      const data = await response.json();

      return data.map(item => item.name);
    } else {
      console.error(response.statusText);
      console.error(`Request Returned Status ${response.status} Error`);
      process.exit(1);
    }
  } catch (error) {
    console.error("Fetch Error!");
    console.log(error);
  }
}

function projectInfo(project) {
  const { name, description, url} = project;
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
    chalk.bold(chalk.underline(url)),
    "\n",
  );
}

async function promptProjectSelection(projects) {
  const choices = projects.map((project) => ({
    name: project.name,
    value: project,
    description: project.description,
  }));

  try {
    const { default: search } = await import("@inquirer/search");
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

// Render the repository contents as a folder structure
function renderProjectContents(contents, indent = "  ") {
  try {
    contents.forEach((item) => {
      if (item.type === "tree") {
        console.log(
          `${indent}`,
          chalk.bgCyanBright(chalk.black(`${item.name}`)),
          chalk.blueBright("/"),
        );
      } else {
        console.log(`${indent}${item.name}`);
      }
    });
  } catch (error) {
    console.error("Unexpected Error occured while rendering contents");
    console.log(error.message);
  }
}

export {
  CONFIG_FILE,
  checkTokenIsValid,
  revokeToken,
  rotateToken,
  getProjects,
  getSingleProject,
  listRepoBranches,
  projectInfo,
  promptProjectSelection,
  renderProjectContents,
}
