#!/usr/bin/env node
import { Command } from 'commander';
import { clearToken, getStoredAuthType, getStoredToken } from './src/gh/auth/tokenHelpers.js';
import config from "./src/gh/auth/config.js";
import { userProfile, login } from "./src/gh/utils/authenticated/requests.js";

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
  .command('profile')
  .description("fetch a minimal overview of your GitHub profile")
  .action(async () => {
    const octokit = await login();
    await userProfile(octokit);
  });

program.parse();
