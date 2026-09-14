import { Octokit } from "@octokit/rest";
import boxen from "boxen";
import chalk from "chalk";
import { Result, ok, err } from "../pattern.js";
import { promptSelection, ChoiceItem } from "../ui.js";

interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private?: boolean;
  [key: string]: unknown;
}

interface RepoContentItem {
  name: string;
  path: string;
  type: string;
  url?: string;
  html_url?: string | null;
}

/**
 * Displays the authenticated user's profile card in terminal.
 */
async function displayUserProfile(octokit: Octokit): Promise<Result<void, string>> {
  try {
    const response = await octokit.rest.users.getAuthenticated();
    const {
      login: userName,
      followers,
      following,
      bio,
      owned_private_repos: privateRepos,
      public_repos: publicRepos,
    } = response.data;

    const bioToShow = !bio
      ? chalk.yellow("Looks Like You Don't Have a Bio Yet :(")
      : bio;
    const followersToShow = !followers
      ? chalk.yellow("no")
      : chalk.yellow(followers);
    const followingToShow = !following
      ? chalk.yellow("no one")
      : chalk.yellow(following);

    const profileInfo = `
  Hello, - ${chalk.bold.cyan(userName)}!
  ${bioToShow}
  You have ${followersToShow} followers & you follow ${followingToShow}

  You currently have ${chalk.yellow(publicRepos ?? 0)} public repo(s) and ${chalk.yellow(privateRepos ?? 0)} private repo(s)
    `.trim();

    console.log(
      boxen(profileInfo, {
        title: chalk.bgGreenBright.black(" profile "),
        titleAlignment: "center",
        padding: 1,
        margin: 1,
        borderStyle: "round",
      }),
    );
    return ok(undefined);
  } catch (error) {
    return err(
      `Failed to fetch user profile: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Checks remaining search API rate limits.
 */
async function checkSearchRateLimit(
  octokit: Octokit,
): Promise<Result<number, string>> {
  try {
    const response = await octokit.rest.rateLimit.get();
    return ok(response.data.resources.search.remaining);
  } catch (error) {
    return err(
      `Failed to check rate limits: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Searches repositories on GitHub with a custom query string.
 */
async function searchRepositories(
  octokit: Octokit,
  query: string,
): Promise<Result<{ items: GitHubRepo[]; totalCount: number }, string>> {
  try {
    const rateLimitResult = await checkSearchRateLimit(octokit);
    if (rateLimitResult.ok && rateLimitResult.value <= 0) {
      return err(
        "You ran out of GitHub search queries! Try again in a few minutes.\n" +
          "Visit https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api to learn more.",
      );
    }

    const response = await octokit.rest.search.repos({
      q: query,
      per_page: 100,
    });

    return ok({
      items: response.data.items as GitHubRepo[],
      totalCount: response.data.total_count,
    });
  } catch (error) {
    return err(
      `Search query failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Fetches repositories starred by the authenticated user.
 */
async function fetchStarredRepositories(
  octokit: Octokit,
): Promise<Result<{ items: GitHubRepo[]; totalCount: number }, string>> {
  try {
    const response =
      await octokit.rest.activity.listReposStarredByAuthenticatedUser({
        per_page: 100,
      });

    const items = response.data as unknown as GitHubRepo[];
    return ok({
      items,
      totalCount: items.length,
    });
  } catch (error) {
    return err(
      `Failed to fetch starred repositories: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Fetches directory or file contents of a repository path.
 */
async function getRepoContents(
  octokit: Octokit,
  repoFullName: string,
  folderPath = "",
): Promise<Result<RepoContentItem[], string>> {
  try {
    const [owner, repo] = repoFullName.split("/");
    if (!owner || !repo) {
      return err(`Invalid repository name format: "${repoFullName}". Expected "owner/repo".`);
    }

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: folderPath,
    });

    if (Array.isArray(response.data)) {
      return ok(
        response.data.map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          url: item.url,
          html_url: item.html_url,
        })),
      );
    }
    return ok([
      {
        name: response.data.name,
        path: response.data.path,
        type: response.data.type,
      },
    ]);
  } catch (error) {
    return err(
      `Failed to get repo contents: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Prompts user to select a repository with autocomplete search.
 */
async function promptRepoSelection(repos: GitHubRepo[]): Promise<GitHubRepo> {
  const choices: Array<ChoiceItem<GitHubRepo>> = repos.map((repo) => ({
    name: repo.full_name,
    value: repo,
    description: repo.description || undefined,
  }));

  return promptSelection(
    choices,
    `${chalk.greenBright("Select a repository: ")}${chalk.yellow("(Autocomplete Available)")}`,
  );
}

/**
 * Prompts user to select a folder from repository for sparse checkout.
 */
async function promptFolderSelection(
  octokit: Octokit,
  repoFullName: string,
  folderPath = "",
): Promise<Result<string | null, string>> {
  const contentsResult = await getRepoContents(octokit, repoFullName, folderPath);
  if (!contentsResult.ok) {
    return err(contentsResult.error);
  }

  const directories = contentsResult.value.filter((item) => item.type === "dir");
  if (directories.length === 0) {
    return ok(null);
  }

  const choices: Array<ChoiceItem<string>> = directories.map((dir) => ({
    name: dir.name,
    value: dir.path,
  }));

  const label = folderPath ? `Select a subfolder in "${folderPath}": ` : "Select a folder from repository root: ";
  const selected = await promptSelection(choices, label);
  return ok(selected);
}

export {
  displayUserProfile,
  checkSearchRateLimit,
  searchRepositories,
  fetchStarredRepositories,
  getRepoContents,
  promptRepoSelection,
  promptFolderSelection,
};
export type { GitHubRepo, RepoContentItem };
