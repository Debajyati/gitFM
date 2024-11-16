#!/usr/bin/env node
import { Command } from 'commander';
import { clearToken, getStoredAuthType, getStoredToken } from './src/gh/auth/tokenHelpers.js';
import config from "./src/gh/auth/config.js";
import { userProfile, login } from "./src/gh/utils/authenticated/requests.js";
import { CONFIG_FILE as GITLAB_CONFIG_FILE } from './src/gl/requests.js';

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
  .option('--logout', "logout from the CLI and delete your GitHub token")
  .action(async (options) => {

    if (options.logout) {
      const { Octokit } = await import("@octokit/rest");
      const storedToken = getStoredToken(config.TOKEN_FILE);

      if (storedToken === null) {
        console.error("Error: Token not found");
        console.error("You are not authenticated");

        process.exit(1);
      }

      const octokit = new Octokit({ auth: storedToken});

      if (getStoredAuthType(config.TOKEN_FILE) === "oauth") {
        octokit.rest.apps.deleteToken({
          client_id: config.CLIENT_ID,
          access_token: storedToken,
        });
      }

      clearToken(config.TOKEN_FILE);

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
  .command('profile')
  .description("get a minimal overview of your profile")
  .option('--gl', "GitLab profile")
  .option('--gh', "GitHub profile")
  .action(async (options) => {
    if (options.gh) {
      const octokit = await login();
      await userProfile(octokit);
    } else {
      // TODO:
    }
  });

program.parse();
