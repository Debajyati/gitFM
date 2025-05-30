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
  .command('gh')
  .description("authorize gitfm with your GitHub")
  .option('--auth [TYPE]', "Choose your prefered way to log in. If wrong/no argument is provided, interactive login will take place. Valid arguments - web, token. \n\nNote: In case of login with browser, browser will auto open the verification URL only if your default browser is anything between chrome, edge or firefox. Otherwise, you will be prompted to manually open the URL in your browser.")
  .option('--profile',"get a minimal overview of your GitHub profile")
  .action(async (options) => {
    if (options.profile) {
      const octokit = await login();
      await userProfile(octokit);
    } else {
      if (options.auth === "token") {
        await login("token");
      } else if (options.auth === "web") {
        await login("oauth");
      } else {
        await login();
      }
    }
  });

program
  .command('gl')
  .description("authorize or unauthorize gitfm with your GitLab")
  .option('--login', "login with a personal access token")
  .option('--logout', "logout and revoke the token")
  .option('--rotate <EXPIRY_DATE>', "rotate the personal access token with an Expiry Date (NOTE: Expiry Date has to be in YYYY-MM-DD format!)")
  .action(async (options) => {
    try {
      const { default: converter } = await import("./src/base64.js")
      const { getStoredToken } = await import("./src/gl/tokenhelpers.js");
      if (options.logout) {
        const { revokeToken } = await import("./src/gl/requests.js");
        const token = getStoredToken(GITLAB_CONFIG_FILE);
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
        const storedtoken = getStoredToken(GITLAB_CONFIG_FILE);
        const authenticate = async () => {
          const { tokenAuthenticate } = await import("./src/gl/auth.js");
          const token = await tokenAuthenticate();
          const { saveToken } = await import("./src/gl/tokenhelpers.js");
          saveToken({token: token}, GITLAB_CONFIG_FILE);
        }
        if (storedtoken !== null) {
          console.log("A token already in use. Checking validity...");
          const { checkTokenIsValid } = await import("./src/gl/requests.js");
          const storedTokenIsValid = await checkTokenIsValid(converter.btoa(storedtoken));
          if (storedTokenIsValid) {
            console.log("Token is valid!");
          } else {
            console.error("Token is invalid or expired!");
            await authenticate();
          }
        } else {
          await authenticate();
        }
      } else {
        const { rotateToken } = await import("./src/gl/requests.js");
        const { getStoredToken } = await import("./src/gl/tokenhelpers.js");
        const token = getStoredToken(GITLAB_CONFIG_FILE);
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
        const { getStoredToken } = await import("./src/gl/tokenhelpers.js");
        const token = getStoredToken(GITLAB_CONFIG_FILE);
        await interactiveClone(token);
      }
    }
  );

program
  .command('clone <REPO_URL> [DIRNAME] [BRANCHNAME] [CONE_MODE]')
  .usage('<REPO_URL> [DIRNAME] [BRANCHNAME] [CONE_MODE] [options]')
  .summary('clone any remote repository using the url. Run `gitfm clone --help` to know how to use this command.')
  .description(' clone any remote git repository using the url. <REPO_URL> is mandatory argument. It is the url of the repository to be cloned. [DIRNAME] and [BRANCHNAME] are optional arguments. [DIRNAME] is the directory name where the repository will be cloned. [BRANCHNAME] is one of all the branches of the remote repository. Only specify if you want to clone a specific branch. If [DIRNAME] is not provided, the repository will be cloned in a directory with the same name as the repository. If [BRANCHNAME] is not provided, the repository will be cloned in the default branch.\n\n Exceptionally, in case of sparse cloning, [BRANCHNAME] is the branch which will be checked out instead of HEAD(you still have access to all the remote branches inside your local clone), at the time of cloning. By default(when no [BRANCHNAME] is provided), the algorithm will switch to the branch with the latest commit, from the default one, after sparse cloning. \n\n [CONE_MODE] is an optional argument meant to be used with only --sparse option. If provided, valid values - cone or nocone. If not provided, default value is nocone. In cone mode you can\'t enter pattern(s) to clone all the file(s) and/or director(y|ies) that match the pattern. You have to manually specify whole path of the director(y|ies) and/or file(s) to clone. Also all the files at the repo root will be cloned and you can\'t change it. In nocone mode, you can enter patterns. Also you won\'t get the files at the repo root by default. But you can change that with two preceeding arguments(pattern to include and pattern to exclude).')
  .option('--sparse <PATH_TO_DIRECTORY...>', 'clone only the specified director(y|ies) or file(s) of the repository(sparse checkout)')
  .option('--shallow', 'shallow clone only the latest commit of the repository')
  .option('--blobless', 'run a blobless clone of the repository')
  .option('--treeless', 'run a treeless clone of the repository')
  .action(async (REPO_URL, DIRNAME, BRANCHNAME, CONE_MODE, options) => {
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
        let noCone = true;
        if (CONE_MODE) {
          if (CONE_MODE === "nocone") {
            noCone = true;
          } else if (CONE_MODE === "cone") {
            noCone = false;
          } else {
            console.error(`Invalid value for argument [CONE_MODE]: ${CONE_MODE}`);
            process.exit(1);
          }
        }
        await runSparseCheckout(REPO_URL, ...optionalArgs, options.sparse, noCone);
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
      console.error(`error during command ${'`gitfm clone`'}: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("ghs [TERM]")
  .description("get a tabular list of GitHub repositories matching the given search term")
  .option("--me", "show only repositories owned by the current user")
  .option("-p, --private", "show only private repositories owned by the current user")
  .option("-s, --starred", "show only starred repositories")
  .option("-u, --user <USER>", "show only repositories owned by the given user")
  .option("-l, --language <LANGUAGE>", "show only repositories written in the given language")
  .option("-t, --topic", "show only repositories with the given topic")
  .option("-r, --readme", "show only repositories with terms matching in the README")
  .action(async (TERM, options) => {
    const mapRepos = (repos) => {
      if (!repos) {
        console.error("No repositories found!");
        process.exit(1);
      }
      return repos.map((repo) => {
        let desc = repo.description;
        if (desc) {
          if (desc.length > 175) {
            desc = desc.substring(0, 175) + "...";
          }
        }
        return {
          name: repo.full_name,
          url: repo.html_url,
          description: desc,
        };
      });
    };

    const {
      login,
      fetchRepos,
      fetchStarredRepos,
      fetchYourPrivateRepos,
      fetchReposByUserName,
      fetchReposBySearchingInReadme,
      fetchReposBySearchingInTopics,
      fetchReposBySearchingInLanguages,
    } = await import("./src/gh/utils/authenticated/requests.js");
    try {
      if (options.me) {
        const octokit = await login();
        const response = await octokit.rest.users.getAuthenticated();
        const userName = response.data.login;
        const repos = await fetchReposByUserName(octokit, userName);
        const mappedRepos = mapRepos(repos.items);
        console.table(mappedRepos, ['name', 'description']);
      }
      if (options.user) {
        const octokit = await login();
        const userName = options.user;
        const mappedRepos = mapRepos((await fetchReposByUserName(octokit, userName)).items);
        console.table(mappedRepos, ['name', 'description']);
      }

      if (options.private) {
        const octokit = await login();
        const mappedRepos = mapRepos((await fetchYourPrivateRepos(octokit)).items);
        console.table(mappedRepos, ['name', 'description']);
      }

      if (options.starred) {
        const octokit = await login();
        const mappedRepos = mapRepos((await fetchStarredRepos(octokit)).items);
        console.table(mappedRepos, ['name', 'description']);
      }

      if (options.language) {
        if (!TERM) {
          console.error("No search term provided!");
          process.exit(1);
        }
        const octokit = await login();
        const mappedRepos = mapRepos((await fetchReposBySearchingInLanguages(octokit, TERM, options.language)).items);
        console.table(mappedRepos, ['name', 'description']);
      }

      if (options.topic) {
        if (!TERM) {
          console.error("No search term provided!");
          process.exit(1);
        }
        const octokit = await login();
        const mappedRepos = mapRepos((await fetchReposBySearchingInTopics(octokit, TERM)).items);
        console.table(mappedRepos, ['name', 'description']);
      }

      if (options.readme) {
        if (!TERM) {
          console.error("No search term provided!");
          process.exit(1);
        }
        const octokit = await login();
        const mappedRepos = mapRepos((await fetchReposBySearchingInReadme(octokit, TERM)).items);
        console.table(mappedRepos, ['name', 'description']);
      }

      if (Object.keys(options).length === 0) {
        if (!TERM) {
          console.error("No search term provided!");
          process.exit(1);
        }
        const octokit = await login();
        const mappedRepos = mapRepos((await fetchRepos(octokit, TERM)).items);
        console.table(mappedRepos, ['name', 'description']);
      }
    } catch (error) {
      console.error(`error during command ${'`gitfm ghs`'}: ${error.message}`);
      process.exit(1);
    }
  });

program.parseAsync();
