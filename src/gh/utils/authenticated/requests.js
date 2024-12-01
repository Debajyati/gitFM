const userProfile = async (octokit) => {
  const { default: boxen } = await import("boxen");
  const { default: chalk } = await import("chalk");
  const response = await octokit.rest.users.getAuthenticated();
  const {
    data: {
      login: userName,
      followers,
      following,
      bio,
      owned_private_repos: privateRepos,
      public_repos: publicRepos,
    },
  } = response;

  const bioToShow = !(bio) ? chalk.yellow("Looks Like You Don't Have a Bio Yet :(") : bio;
  const followersToShow = !(followers) ? chalk.yellow("no") : chalk.yellow(followers);
  const followingToShow = !(following) ? chalk.yellow("no one") : chalk.yellow(following);

  const profileInfo = `
  Hello, - ${userName}!
  ${bioToShow}
  You have ${followersToShow} followers & you follow ${followingToShow}

  You currently have ${chalk.yellow(publicRepos)} public repo(s) and ${chalk.yellow(privateRepos)} private repo(s)  
  `;

  console.log(boxen(profileInfo,
    {title: `${chalk.bgGreenBright('profile')}`, titleAlignment: 'center'}
  ));
};

const login = async (authType) => { // authType (optional) = "oauth" | "token" 
  const config = await import("../../auth/config.js");
  const { getStoredToken } = await import("../../auth/tokenHelpers.js");
  const { checkTokenValidity } = await import("../../auth/index.js");
  const storedToken = getStoredToken(config.default.TOKEN_FILE);

  console.log("checking if already authorized...");

  if (storedToken !== null) {
    if (await checkTokenValidity(storedToken)) {
      console.log("\nUser is already authorized!\n");
      const { Octokit } = await import("@octokit/rest");
      const octokit = new Octokit({ auth:storedToken });
      return octokit;
    } else {
      console.error("\nLooks Like Your Token Expired! Initiating Authorization\n");
      const { clearToken } = await import("../../auth/tokenHelpers.js");
      clearToken();
      const { authLogin, authLoginInteractive } = await import("../../auth/index.js");
      if (authType) {
        return await authLogin(authType);
      } else {
        return await authLoginInteractive();
      }
    }
  } else {
    if (authType === "oauth") {
      const { authLogin } = await import("../../auth/index.js");
      const octokit = await authLogin("oauth");
      return octokit;
    } else if (authType === "token") {
      const { authLogin } = await import("../../auth/index.js");
      const octokit = await authLogin("token");
      return octokit;
    } else {
      const { authLoginInteractive } = await import("../../auth/index.js");
      const octokit = await authLoginInteractive();
      return octokit;
    }
  }
}

const getCurrentRateLimits = async (octokit) => {
  const response = await octokit.rest.rateLimit.get();
  return response.data.resources;
};

const fetchRepos = async (octokit, searchTerm) => {
  const response = await octokit.rest.search.repos({
    q: searchTerm,
    per_page: 100,
  });
  return {
    items: response.data.items,
    length: response.data.total_count,
  };
};

const fetchReposByUserName = async (octokit, userName) => {
  const response = await octokit.rest.search.repos({
    q: `user:${userName}`,
    per_page: 100,
  });
  return {
    items: response.data.items,
    length: response.data.total_count,
  };
};

const fetchReposBySearchingInReadme = async (octokit, searchTerm) => {
  const response = await octokit.rest.search.repos({
    q: `q=${encodeURIComponent(`${searchTerm} in:readme`)}`,
    per_page: 100,
  });
  return {
    items: response.data.items,
    length: response.data.total_count,
  };
};

const fetchReposBySearchingInTopics = async (octokit, searchTerm) => {
  const response = await octokit.rest.search.repos({
    q: `q=${encodeURIComponent(`${searchTerm} in:topics`)}`,
    per_page: 100,
  });
  return {
    items: response.data.items,
    length: response.data.total_count,
  };
};

const fetchReposBySearchingInLanguages = async (octokit, searchTerm, language) => {
  const response = await octokit.rest.search.repos({
    q: `q=${encodeURIComponent(`${searchTerm} language:${language}`)}`,
    per_page: 100,
  });
  return {
    items: response.data.items,
    length: response.data.total_count,
  };
};

const fetchYourPrivateRepos = async (octokit) => {
  const response = await octokit.rest.search.repos({
    q: `is:private`,
    per_page: 100,
  });
  return {
    items: response.data.items,
    length: response.data.total_count,
  };
};

const fetchStarredRepos = async (octokit) => {
  const response = await octokit.rest.activity.listReposStarredByAuthenticatedUser({
    per_page: 100,
  });
  return {
    items: response.data.items,
    length: response.data.total_count,
  };
};

const repoInfo = async (repo) => {
  const { default:chalk } = await import("chalk");
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

function filterMapRepoContents(contents) {
  return contents.filter((item) => item.type === "dir").map((item) => ({
    name: item.name,
    value: item.path,
  }));
}

// Prompt the user to select a repository from the list with Autocomplete
const promptRepoSelection = async (repos) => {
  const choices = mapRepos(repos);
  const { default:chalk } = await import("chalk");
  try {
    const {default:search} = await import("@inquirer/search");
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

const getRepoContent = async (octokit, repoFullName) => {
  const response = await octokit.rest.repos.getContent({
    owner: repoFullName.split("/")[0],
    repo: repoFullName.split("/")[1],
    path: "",
  });
  return response.data;
}

const getRepoFolderContents = async (octokit, repoFullName, folderPath) => {
  const response = await octokit.rest.repos.getContent({
    owner: repoFullName.split("/")[0],
    repo: repoFullName.split("/")[1],
    path: folderPath,
  });
  return response.data;
}

const promptFolderSelectionFromRoot = async (octokit, repoFullName) => {
  const repoContent = await getRepoContent(octokit, repoFullName);
  const repoParentDirs = filterMapRepoContents(repoContent);

  if (repoParentDirs.length < 1) {
    return null;
  } else {

    const { default:search } = await import("@inquirer/search");

    return await search({
      message: "Select a folder from repository root: ",
      source: async (input, { signal }) => {
        if (signal.aborted) {
          const { default:chalk } = await import("chalk");
          console.log(chalk.yellow("Aborted!"));
          process.exit(1);
        }

        if (!input) {
          return repoParentDirs;
        } else {
          const filteredChoices = repoParentDirs.filter((choice) =>
            choice.name.includes(input),
          );
          return filteredChoices;
        }
      }
    });
  }
}

const promptFolderSelectionFromSubFolder = async (octokit, repoFullName, folderPath) => {
  const dirContents = (await getRepoFolderContents(octokit, repoFullName, folderPath)).filter((item) => item.type === "dir");

  if (dirContents.length < 1) {
    return null;
  } else {
    const dirChoices = dirContents.map((item) => ({
      name: item.name,
      value: item.path,
    }));
    const { default:search } = await import("@inquirer/search");
    return await search({
      message: "Select a folder",
      source: async (input, { signal }) => {
        if (signal.aborted) {
          console.log(chalk.yellow("Aborted!"));
          process.exit(1);
        }

        if (!input) {
          return dirChoices;
        } else {
          const filteredChoices = dirChoices.filter((choice) =>
            choice.name.includes(input),
          );
          return filteredChoices;
        }
      }
    });
  }
}

export {
  login,
  userProfile,
  fetchReposByUserName,
  fetchReposBySearchingInReadme,
  fetchReposBySearchingInTopics,
  fetchReposBySearchingInLanguages,
  fetchYourPrivateRepos,
  fetchStarredRepos,
  fetchRepos,
  repoInfo,
  promptRepoSelection,
  getRepoContent,
  getRepoFolderContents,
  promptFolderSelectionFromRoot,
  promptFolderSelectionFromSubFolder,
  filterMapRepoContents,
  getCurrentRateLimits,
};
