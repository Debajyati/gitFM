#!/usr/bin/env node
import { Command } from 'commander';
import { userProfile, login } from "./src/gh/utils/authenticated/requests.js";
const { CONFIG_FILE: GITLAB_CONFIG_FILE } = await import('./src/gl/requests.js');

const packageJson = await (async ()=>{
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  return require("./package.json");
})();
const program = new Command();

program.addHelpText('beforeAll', await ( async () => {
  const { headerText } = await import("./src/gh/utils/headerText.js");
  return headerText;
})());

program
  .name(`${packageJson.name}`)
  .description(`${packageJson.description}`)
  .version(`${packageJson.version}`);

program
  .command('ghauth')
  .description("authorize or unauthorize gitfm with your GitHub")
  .option('--login [TYPE]', "Choose your prefered way to log in. If wrong/no argument is provided, interactive login will take place. Valid arguments - web, token. \nNote: In case of login with browser, browser will auto open the verification URL only if your default browser is anything between chrome, edge or firefox. Otherwise, you will be prompted to manually open the URL in your browser.")
  .option('--logout', "logout from the CLI and delete(revoke) your GitHub token")
  .option('--refresh', "refresh your GitHub token")
  .action(async (options) => {

    if (options.logout) {
      const { revokeToken } = await import("./src/gh/auth/index.js");
      await revokeToken();
    } else if (options.refresh) {
      const { refreshToken } = await import("./src/gh/auth/index.js");
      await refreshToken();
    } else {
      if (options.login === "token") {
        await login("token");
      } else if (options.login === "web") {
        await login("oauth");
      } else {
        await login();
      }
    }
  });

program
  .command('glauth')
  .description("authorize or unauthorize gitfm with your GitLab")
  .option('--login', "login with a personal access token")
  .option('--logout', "logout and revoke the token")
  .option('--rotate <EXPIRY_DATE>', "rotate the personal access token with an Expiry Date (NOTE: Expiry Date has to be in YYYY-MM-DD format!)")
  .action(async (options) => {
    try {
      if (options.logout) {
        const { revokeToken, configJson } = await import("./src/gl/requests.js");
        const token = configJson.token;
        if (token !== null) {
          const resStatus = await revokeToken(token);
          if (resStatus === "successful") {
            console.log("Token successfully revoked!");
            const { clearToken } = await import("./src/gl/tokenhelpers.js");
            clearToken(GITLAB_CONFIG_FILE);
          } else if (resStatus === "unsuccessful") {
            console.error("Bad Request: Couldn't revoke successfully!");
            process.exit(1);
          } else if (resStatus === "invalid") {
            console.error("The access token is invalid!");
            process.exit(1);
          }
        } else {
          console.error("Can't Logout: Not currently Authenticated!");
          process.exit(1);
        }
      } else if (options.login) {
        const { configJson } = await import("./src/gl/requests.js");
        if (configJson.token !== null) {
          console.log("A token already in use. Checking validity...");
        }
        const { tokenAuthenticate } = await import("./src/gl/auth.js");
        const token = await tokenAuthenticate();
        const { saveToken } = await import("./src/gl/tokenhelpers.js");
        saveToken({token: token}, GITLAB_CONFIG_FILE);
      } else {
        const { rotateToken, configJson } = await import("./src/gl/requests.js");
        const token = configJson.token;
        const { saveToken } = await import("./src/gl/tokenhelpers.js");
        const expiryDate = options.rotate;

        const newToken = await rotateToken(token, expiryDate);
        saveToken({token: newToken}, GITLAB_CONFIG_FILE);
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });

program
  .command('ghprofile')
  .description("get a minimal overview of your GitHub profile")
  .action(async () => {
    const octokit = await login();
    await userProfile(octokit);
  });

program
  .command('icl')
  .description("interactively clone a GitHub or GitLab repository")
  .option('-u, --unauthenticated', 'legacy version of the GitHub repo interactive clone command (without authentication and partial cloning support)')
  .option('--gh', 'clone a GitHub repository')
  .option('--gl', 'clone a GitLab repository')
  .action(
    async (options) => {
      if (options.unauthenticated || options.u) {
        const { unAuthenticatedInteractiveClone } = await import("./src/gh/utils/unauthenticated/interactiveFlow.js");
        await unAuthenticatedInteractiveClone();
      } else if (options.gh) {
        const { interactiveClone } = await import("./src/gh/utils/authenticated/interactiveFlow.js");
        const { login } = await import("./src/gh/utils/authenticated/requests.js");
        const octokit = await login();
        await interactiveClone(octokit);
      } else if (options.gl) {
        const { interactiveClone } = await import("./src/gl/interactiveFlow.js");
        const { configJson } = await import("./src/gl/requests.js");
        await interactiveClone(configJson.token);
      }
    }
  );

program
  .command('clone <REPO_URL> [DIRNAME] [BRANCHNAME]')
  .usage('<REPO_URL> [DIRNAME] [BRANCHNAME] [options]')
  .summary('clone any remote repository using the url. Run `gitfm clone --help` to know how to use this command.')
  .description('clone any remote git repository using the url. <REPO_URL> is mandatory argument. It is the url of the repository to be cloned. [DIRNAME] and [BRANCHNAME] are optional arguments. [DIRNAME] is the directory name where the repository will be cloned. [BRANCHNAME] is one of all the branches of the remote repository. Only specify if you want to clone a specific branch. If [DIRNAME] is not provided, the repository will be cloned in a directory with the same name as the repository. If [BRANCHNAME] is not provided, the repository will be cloned in the default branch. Exceptionally, in case of sparse cloning [BRANCHNAME] is the branch which will be switched to after cloning is completed. By default(when no [BRANCHNAME] is provided), the algorithm will switch to the branch with the latest commit from the default one after sparse cloning.')
  .option('--sparse <PATH_TO_DIRECTORY...>', 'clone only the specified directory or directories of the repository(sparse checkout)')
  .option('--shallow', 'shallow clone only the latest commit of the repository')
  .option('--blobless', 'run a blobless clone of the repository')
  .option('--treeless', 'run a treeless clone of the repository')
  .action(async (REPO_URL, DIRNAME, BRANCHNAME, options) => {
    const { runSparseCheckout, normalClone, runShallowClone, runBloblessClone, runTreelessClone } = await import("./cloning.js");

    const optionalArgs = [];
    const urlPattern = new RegExp('^(https?|ssh):\\/\\/([\\w.-]+(:[\\w.-]+)?@)?([\\w.-]+)(:\\d+)?(\\/[\\w.-]+)*\\/?$');
    const isValidUrl = (url) => {
      return urlPattern.test(url);
    }
    if (!isValidUrl(REPO_URL)) {
      console.error(`Invalid URL: ${REPO_URL}`);
      process.exit(1);
    }

    if (DIRNAME) {
      optionalArgs.push(DIRNAME);
    } else {
      optionalArgs.push('');
    }
    if (BRANCHNAME) {
      optionalArgs.push(BRANCHNAME);
    } else {
      optionalArgs.push('');
    }

    try {
      if (options.sparse) {
        await runSparseCheckout(REPO_URL, ...optionalArgs, options.sparse);
      } else if (options.shallow) {
        await runShallowClone(REPO_URL, ...optionalArgs);
      } else if (options.blobless) {
        await runBloblessClone(REPO_URL, ...optionalArgs);
      } else if (options.treeless) {
        await runTreelessClone(REPO_URL, ...optionalArgs);
      } else {
        await normalClone(REPO_URL, ...optionalArgs);
      }
    } catch (error) {
      console.error(`error during ${'`gitfm clone`'}: ${error.message}`);
      process.exit(1);
    }
  });

program.parseAsync();
