import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Result, ok, err } from "./pattern.js";

const execFileAsync = promisify(execFile);

async function executeCommand(
  command: string,
  args: string[] = [],
): Promise<Result<string, string>> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args);
    if (stderr) {
      const { default: chalk } = await import("chalk");
      console.log(chalk.yellowBright(stderr));
    }
    return ok(stdout);
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
}

async function runNormalClone(
  repoUrl: string,
  dirName = "",
  branch = "",
): Promise<void> {
  const cloneArgs = ["clone", repoUrl];
  if (branch) cloneArgs.push("--single-branch", "--branch", branch);
  if (dirName) cloneArgs.push(dirName);
  const result = await executeCommand("git", cloneArgs);
  if (!result.ok) {
    console.error("Error during cloning process:", result.error);
    return;
  }
  const { default: chalk } = await import("chalk");
  console.log(chalk.greenBright(result.value));
  console.log("Cloning completed successfully!");
}

async function runShallowClone(
  repoUrl: string,
  dirName = "",
  branch = "",
): Promise<void> {
  if (!dirName) {
    dirName =
      repoUrl
        ?.split("/")
        ?.pop()
        ?.replace(/\.git$/, "") || "default-repo";
  }
  const result = !branch
    ? await executeCommand("git", ["clone", "--depth", "1", repoUrl, dirName])
    : await executeCommand("git", [
      "clone",
      "--depth",
      "1",
      "--single-branch",
      "-b",
      branch,
      repoUrl,
      dirName,
    ]);
  if (!result.ok) {
    console.error("Error during shallow cloning process:", result.error);
    return;
  }
  const { default: chalk } = await import("chalk");
  console.log(chalk.greenBright(result.value));
  console.log("Shallow cloning completed successfully!");
}

async function runBloblessClone(
  repoUrl: string,
  dirName = "",
  branch = "",
): Promise<void> {
  if (!dirName) {
    dirName =
      repoUrl
        ?.split("/")
        ?.pop()
        ?.replace(/\.git$/, "") || "default-repo";
  }
  const result = !branch
    ? await executeCommand("git", [
      "clone",
      "--filter=blob:none",
      repoUrl,
      dirName,
    ])
    : await executeCommand("git", [
      "clone",
      "--filter=blob:none",
      "--single-branch",
      "-b",
      branch,
      repoUrl,
      dirName,
    ]);
  if (!result.ok) {
    console.error("Error during blobless cloning process:", result.error);
    return;
  }
  const { default: chalk } = await import("chalk");
  console.log(chalk.greenBright(result.value));
  console.log("Blobless cloning completed successfully!");
}

async function runTreelessClone(
  repoUrl: string,
  dirName = "",
  branch = "",
): Promise<void> {
  if (!dirName) {
    dirName =
      repoUrl
        ?.split("/")
        ?.pop()
        ?.replace(/\.git$/, "") || "default-repo";
  }
  if (!branch) {
    await executeCommand("git", [
      "clone",
      "--no-checkout",
      "--filter=tree:0",
      repoUrl,
      dirName,
    ]);
  } else {
    await executeCommand("git", [
      "clone",
      "--no-checkout",
      "--filter=tree:0",
      "--single-branch",
      "-b",
      branch,
      repoUrl,
      dirName,
    ]);
  }
  console.log("Treeless cloning completed successfully!");
}

async function runSparseCheckout(
  repoUrl: string,
  dirName = "",
  branch = "",
  pathToDirectory:string|string[] = "",
  noCone = true,
): Promise<void> {
  // Validate inputs
  if (!pathToDirectory) {
    throw new Error("Path to directory for sparse checkout cannot be empty.");
  }

  if (!dirName) {
    dirName =
      repoUrl
        ?.split("/")
        ?.pop()
        ?.replace(/\.git$/, "") || "default-repo";
  }

  const cloneArgs = ["clone", "--no-checkout", "--filter=blob:none"];
  // if (branch) cloneArgs.push('-b', branch);
  cloneArgs.push(repoUrl, dirName);

  const cloneResult = await executeCommand("git", cloneArgs);
  if (!cloneResult.ok) {
    console.error("Error during cloning process:", cloneResult.error);
    return;
  }
  console.log(cloneResult.value);

  // Change to cloned directory
  process.chdir(dirName);

  // Initialize sparse-checkout
  const sparseAddDirArgs = ["sparse-checkout", "add"];
  if (noCone) {
    const sparseCheckoutSettingsResult = await executeCommand("git", ["sparse-checkout", "set", "--no-cone"]);
    if (!sparseCheckoutSettingsResult.ok) {
      console.error("Error setting sparse-checkout mode:", sparseCheckoutSettingsResult.error);
      return;
    }
    console.log(sparseCheckoutSettingsResult.value);
    sparseAddDirArgs.push("!/*");
  } else {
    const sparseCheckoutSettingsResult = await executeCommand("git", ["sparse-checkout", "set", "--cone"]);
    if (!sparseCheckoutSettingsResult.ok) {
      console.error("Error setting sparse-checkout mode:", sparseCheckoutSettingsResult.error);
      return;
    }
    console.log(sparseCheckoutSettingsResult.value);
  }

  const targetDirs = Array.isArray(pathToDirectory)
    ? pathToDirectory
    : [pathToDirectory];
  await executeCommand("git", [...sparseAddDirArgs, ...targetDirs]);

  // Determine default branch if not provided
  let result = await executeCommand("git", [
    "ls-remote",
    "--sort=-committerdate",
    "--heads",
    "origin",
  ]);
  if (!result.ok) {
    console.error("Error fetching remote branches:", result.error);
    return;
  }
  const branchList = result.value
    .split("\n")
    .map((line) => line?.split("\t")?.pop()?.replace("refs/heads/", "")?.trim());
  const defaultLocalBranch = branch || branchList[0] || "main";

  // Checkout branch
  result = await executeCommand("git", ["checkout", defaultLocalBranch]);
  if (!result.ok) {
    console.error("Error during sparse checkout process:", result.error);
    return;
  }
  const { default: chalk } = await import("chalk");
  console.log(chalk.greenBright(result.value));

  console.log("Cloning portion of the repo completed successfully!");
}

export {
  executeCommand,
  runNormalClone,
  runNormalClone as normalClone,
  runSparseCheckout,
  runShallowClone,
  runBloblessClone,
  runTreelessClone,
};
