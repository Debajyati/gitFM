import { Result, ok, err } from "./pattern.js";

const GIT_URL_REGEX =
  /^(?:(?:https?|git|ssh):\/\/(?:[\w.-]+(?::[\w.-]+)?@)?[\w.-]+(?::\d+)?\/[\w./-]+|git@[\w.-]+:[\w./-]+)(?:\.git)?\/?$/;

const DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/**
 * Validates whether a given string is a valid Git repository URL.
 */
function validateGitUrl(url: string): Result<string, string> {
  const trimmed = url.trim();
  if (!trimmed) {
    return err("Repository URL cannot be empty.");
  }
  if (trimmed.startsWith("-")) {
    return err("Invalid URL: cannot start with a hyphen.");
  }
  if (!GIT_URL_REGEX.test(trimmed)) {
    return err(`Invalid Git repository URL: "${trimmed}"`);
  }
  return ok(trimmed);
}

/**
 * Sanitizes and validates a target directory name for cloning.
 */
function sanitizeDirectoryName(dir: string): Result<string, string> {
  const trimmed = dir.trim();
  if (!trimmed) {
    return ok("");
  }
  if (trimmed.startsWith("-")) {
    return err("Directory name cannot start with a hyphen.");
  }
  if (trimmed.includes("\0")) {
    return err("Directory name contains invalid null bytes.");
  }
  if (trimmed === ".." || trimmed.startsWith("../") || trimmed.includes("/../") || trimmed.endsWith("/..")) {
    return err("Directory traversal (..) is not allowed in directory names.");
  }
  return ok(trimmed);
}

/**
 * Sanitizes and validates a Git branch name.
 */
function sanitizeBranchName(branch: string): Result<string, string> {
  const trimmed = branch.trim();
  if (!trimmed) {
    return ok("");
  }
  if (trimmed.startsWith("-")) {
    return err("Branch name cannot start with a hyphen.");
  }
  // Git branch restrictions (cannot contain .., ~, ^, :, ?, *, [, \, or control characters)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F ~^:?*[\\]/.test(trimmed) || trimmed.includes("..") || trimmed.endsWith("/")) {
    return err(`Invalid Git branch name: "${trimmed}"`);
  }
  return ok(trimmed);
}

/**
 * Sanitizes and validates cone mode argument.
 */
function sanitizeConeMode(mode?: string): Result<"cone" | "nocone", string> {
  if (!mode) {
    return ok("nocone");
  }
  const normalized = mode.trim().toLowerCase();
  if (normalized === "cone" || normalized === "nocone") {
    return ok(normalized);
  }
  return err(`Invalid value for [CONE_MODE]: "${mode}". Expected "cone" or "nocone".`);
}

/**
 * Sanitizes and validates a date string for token expiration (YYYY-MM-DD) and checks it is a valid date in the future.
 */
function sanitizeExpiryDate(dateStr: string): Result<string, string> {
  const trimmed = dateStr.trim();
  if (!DATE_REGEX.test(trimmed)) {
    return err(`Invalid expiry date format: "${dateStr}". Expected YYYY-MM-DD.`);
  }

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return err(`Invalid calendar date: "${dateStr}".`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedDate <= today) {
    return err(`Expiry date must be in the future: "${dateStr}".`);
  }

  return ok(trimmed);
}

/**
 * Sanitizes a search term.
 */
function sanitizeSearchTerm(term: string): Result<string, string> {
  const trimmed = term.trim();
  if (!trimmed) {
    return err("Search term cannot be empty.");
  }
  return ok(trimmed);
}

/**
 * Sanitizes a personal access token or OAuth token.
 */
function sanitizeToken(token: string): Result<string, string> {
  const trimmed = token.trim();
  if (!trimmed) {
    return err("Token cannot be empty.");
  }
  if (/[\r\n\0]/.test(trimmed)) {
    return err("Token contains invalid control characters or line breaks.");
  }
  return ok(trimmed);
}

export {
  validateGitUrl,
  sanitizeDirectoryName,
  sanitizeBranchName,
  sanitizeConeMode,
  sanitizeExpiryDate,
  sanitizeSearchTerm,
  sanitizeToken,
};
