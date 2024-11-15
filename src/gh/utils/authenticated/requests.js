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

  const profileInfo = `
  Hello, - ${userName}!
  ${bio}
  You have ${followers} followers & you follow ${following}

  You currently have ${publicRepos} public repos and ${privateRepos} private repos.
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
      console.error("\nToken Expired! Initiating Authorization\n");
      const { clearToken } = await import("../../auth/tokenHelpers.js");
      clearToken();
      return await login(authType);
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

export { login, userProfile };
