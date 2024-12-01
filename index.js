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
  .option('--login [TYPE]', "Choose your prefered way to log in. If wrong/no argument is provided, interactive login will take place. Valid arguments - web, token")
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
  .command('ghclone')
  .description("clone a GitHub repository")
  .option('-u, --unauthenticated', 'legacy version of this command (without authentication and partial cloning support)')
  .action(
    async (options) => {
      if (options.unauthenticated || options.u) {
        const { unAuthenticatedInteractiveClone } = await import("./src/gh/utils/unauthenticated/interactiveFlow.js");
        await unAuthenticatedInteractiveClone();
      } else {
        const { interactiveClone } = await import("./src/gh/utils/authenticated/interactiveFlow.js");
        const { login } = await import("./src/gh/utils/authenticated/requests.js");
        const octokit = await login();
        await interactiveClone(octokit);
      }
    }
  );

program
  .command('glclone')
  .description("clone a GitLab repository")
  .action(
    async () => {
      const { interactiveClone } = await import("./src/gl/interactiveFlow.js");
      const { configJson } = await import("./src/gl/requests.js");
      await interactiveClone(configJson.token);
    }
  );

program.parse();
