import { Result, ok, err } from "../pattern.js";
import { sanitizeExpiryDate, sanitizeSearchTerm, sanitizeToken } from "../sanitize.js";
import { promptSelection, ChoiceItem } from "../ui.js";
import { GITLAB_CONFIG } from "./config.js";

interface GitLabProject {
  name: string;
  description: string | null;
  url: string;
  projectID: number;
}

interface GitLabTreeItem {
  id: string;
  name: string;
  type: string;
  path: string;
  mode: string;
}

/**
 * Checks whether a GitLab Personal Access Token is valid.
 */
async function checkTokenIsValid(token: string): Promise<Result<string, string>> {
  const sanitized = sanitizeToken(token);
  if (!sanitized.ok) {
    return err(sanitized.error);
  }

  const url = `${GITLAB_CONFIG.BASE_URL}/personal_access_tokens`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": sanitized.value,
      },
    });

    if (response.status === 401) {
      return err("Invalid GitLab access token: Unauthorized.");
    }
    if (!response.ok) {
      return err(`GitLab API error: status ${response.status} ${response.statusText}`);
    }

    return ok(sanitized.value);
  } catch (error) {
    return err(
      `Failed to verify GitLab token: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Revokes the currently authenticated Personal Access Token on GitLab.
 */
async function revokeToken(token: string): Promise<Result<void, string>> {
  const sanitized = sanitizeToken(token);
  if (!sanitized.ok) {
    return err(sanitized.error);
  }

  const url = `${GITLAB_CONFIG.BASE_URL}/personal_access_tokens/self`;
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "PRIVATE-TOKEN": sanitized.value,
      },
    });

    if (response.status === 204) {
      return ok(undefined);
    }
    if (response.status === 400) {
      return err("Bad request: Could not revoke GitLab token.");
    }
    if (response.status === 401) {
      return err("The access token is already invalid or expired.");
    }

    return err(`Unexpected status ${response.status} while revoking token.`);
  } catch (error) {
    return err(
      `Failed to revoke GitLab token: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Rotates a GitLab Personal Access Token with a specified expiration date (YYYY-MM-DD).
 */
async function rotateToken(
  token: string,
  expirationDate: string,
): Promise<Result<string, string>> {
  const sanitizedToken = sanitizeToken(token);
  if (!sanitizedToken.ok) {
    return err(sanitizedToken.error);
  }

  const sanitizedDate = sanitizeExpiryDate(expirationDate);
  if (!sanitizedDate.ok) {
    return err(sanitizedDate.error);
  }

  const url = `${GITLAB_CONFIG.BASE_URL}/personal_access_tokens/self/rotate`;
  try {
    const query = new URLSearchParams({
      expires_at: sanitizedDate.value,
    }).toString();

    const response = await fetch(`${url}?${query}`, {
      method: "POST",
      headers: {
        "PRIVATE-TOKEN": sanitizedToken.value,
      },
    });

    if (response.ok) {
      const data = (await response.json()) as { token: string };
      return ok(data.token);
    }

    if (response.status === 400) {
      return err("Bad request: Token could not be rotated.");
    }
    if (response.status === 401) {
      return err("The token has expired or has already been revoked.");
    }
    if (response.status === 403) {
      return err("The token is not permitted to rotate itself.");
    }
    if (response.status === 405) {
      return err("The provided token is not a Personal Access Token.");
    }

    return err(`Unknown error rotating token: status ${response.status}`);
  } catch (error) {
    return err(
      `Failed to rotate GitLab token: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Searches projects on GitLab matching the search term.
 */
async function getProjects(
  token: string,
  searchTerm: string,
): Promise<Result<GitLabProject[], string>> {
  const sanitizedToken = sanitizeToken(token);
  if (!sanitizedToken.ok) {
    return err(sanitizedToken.error);
  }

  const sanitizedSearch = sanitizeSearchTerm(searchTerm);
  if (!sanitizedSearch.ok) {
    return err(sanitizedSearch.error);
  }

  const url = `${GITLAB_CONFIG.BASE_URL}/search?scope=projects&search=${encodeURIComponent(sanitizedSearch.value)}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": sanitizedToken.value,
      },
    });

    if (!response.ok) {
      return err(`GitLab search failed: status ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Array<{
      path_with_namespace: string;
      description: string | null;
      http_url_to_repo: string;
      id: number;
    }>;

    const projectsList: GitLabProject[] = data.map((project) => ({
      name: project.path_with_namespace,
      description: project.description,
      url: project.http_url_to_repo,
      projectID: project.id,
    }));

    return ok(projectsList);
  } catch (error) {
    return err(
      `GitLab search request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Gets repository tree for a single GitLab project.
 */
async function getSingleProjectTree(
  token: string,
  projectId: number | string,
  recursive = false,
): Promise<Result<GitLabTreeItem[], string>> {
  const sanitizedToken = sanitizeToken(token);
  if (!sanitizedToken.ok) {
    return err(sanitizedToken.error);
  }

  const url = `${GITLAB_CONFIG.BASE_URL}/projects/${encodeURIComponent(projectId)}/repository/tree?recursive=${recursive}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": sanitizedToken.value,
      },
    });

    if (!response.ok) {
      return err(
        `Failed to fetch project tree: status ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GitLabTreeItem[];
    return ok(data);
  } catch (error) {
    return err(
      `Failed to get project tree: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Prompts user to select a GitLab project with autocomplete.
 */
async function promptProjectSelection(
  projects: GitLabProject[],
): Promise<GitLabProject> {
  const choices: Array<ChoiceItem<GitLabProject>> = projects.map((project) => ({
    name: project.name,
    value: project,
    description: project.description || undefined,
  }));

  return promptSelection(choices, "Select a GitLab project: ");
}

export {
  checkTokenIsValid,
  revokeToken,
  rotateToken,
  getProjects,
  getSingleProjectTree,
  promptProjectSelection,
};
export type { GitLabProject, GitLabTreeItem };
