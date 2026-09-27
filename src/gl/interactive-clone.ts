import chalk from "chalk";
import { Result, ok, err } from "../pattern.js";
import { cloningOptions, partialCloningOptions } from "../constants.js";
import {
  runNormalClone,
  runShallowClone,
  runTreelessClone,
  runBloblessClone,
  runSparseCheckout,
} from "../cloning.js";
import {
  displayRepoInfo,
  getHeaderText,
  promptInput,
  promptSelection,
  ChoiceItem,
} from "../ui.js";
import { sanitizeSearchTerm } from "../sanitize.js";
import {
  getProjects,
  getSingleProjectTree,
  promptProjectSelection,
} from "./api.js";

/**
 * Executes interactive cloning workflow for GitLab projects.
 */
async function interactiveGitLabClone(token: string): Promise<Result<void, string>> {
  console.log(getHeaderText());

  if (!token) {
    return err("No GitLab token provided or token is empty.");
  }

  const rawSearch = await promptInput(
    chalk.greenBright("Search a GitLab Project -> "),
  );
  const sanitizedSearch = sanitizeSearchTerm(rawSearch);
  if (!sanitizedSearch.ok) {
    return err(sanitizedSearch.error);
  }

  const projectsResult = await getProjects(token, sanitizedSearch.value);
  if (!projectsResult.ok) {
    return err(projectsResult.error);
  }

  const projects = projectsResult.value;
  if (projects.length === 0) {
    console.log(chalk.yellow("No Projects Found!"));
    return ok(undefined);
  }

  const selectedProject = await promptProjectSelection(projects);
  displayRepoInfo(selectedProject);

  const cloneChoices: Array<ChoiceItem<string>> = cloningOptions.map((opt) => ({
    name: opt.name,
    value: opt.value,
    description: opt.description,
  }));

  const cloningPreference = await promptSelection(
    cloneChoices,
    "Choose your preferred way to clone the repository",
  );

  if (cloningPreference === "partial") {
    const partialChoices: Array<ChoiceItem<string>> = partialCloningOptions.map(
      (opt) => ({
        name: opt.name,
        value: opt.value,
        description: opt.description,
      }),
    );

    const partialPreference = await promptSelection(
      partialChoices,
      "Choose your preferred way to partially clone the repository",
    );

    if (partialPreference === "shallow") {
      await runShallowClone(selectedProject.url);
    } else if (partialPreference === "treeless") {
      await runTreelessClone(selectedProject.url);
    } else if (partialPreference === "blobless") {
      await runBloblessClone(selectedProject.url);
    } else if (partialPreference === "sparse") {
      const treeResult = await getSingleProjectTree(
        token,
        selectedProject.projectID,
        true,
      );
      if (!treeResult.ok) {
        return err(treeResult.error);
      }

      const folderItems = treeResult.value.filter(
        (item) => item.type === "tree",
      );
      if (folderItems.length === 0) {
        console.log(chalk.yellow("No folders found in the project."));
        return ok(undefined);
      }

      const folderChoices: Array<ChoiceItem<string>> = folderItems.map(
        (item) => ({
          name: item.path,
          value: item.path,
        }),
      );

      const pathToDirectory = await promptSelection(
        folderChoices,
        "Enter the directory you want to clone -> ",
      );

      await runSparseCheckout(selectedProject.url, "", "", pathToDirectory, true);
    }
  } else {
    await runNormalClone(selectedProject.url);
  }

  return ok(undefined);
}

export { interactiveGitLabClone };
