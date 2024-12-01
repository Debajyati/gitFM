import chalk from "chalk";

const cloningOptions = [
  {
    name: "Normal Cloning",
    value: "normal",
    description: "Clones the entire repository, including all branches and history.",
  },
  {
    name: "Partial Cloning",
    value: "partial",
    description: "Clones only specific parts of the repository, such as a single branch or a subset of files.",
  }
];

const partialCloningOptions = [
  {
    name: "Shallow Cloning",
    value: "shallow",
    description: "shallow clone only the latest commit",
  },
  {
    name: "Sparse Cloning",
    value: "sparse",
    description: "clone only a specific folder",
  },
  {
    name: "Blobless Cloning",
    value: "blobless",
    description: `
    Clones the repository by fetching only the repository metadata and history.
    file contents (blobs) fetched on-demand when accessed.`,
  },
  {
    name: "Treeless Cloning",
    value: "treeless",
    description:
      "Clones the repository without checking out the working directory tree,\n including only the repository metadata and history.",
  },
];

export async function interactiveClone(token) {
  const { headerText } = await import("../gh/utils/headerText.js");
  console.log(headerText);
  const {
    getProjects,
    getSingleProject,
    promptProjectSelection,
    projectInfo,
  } = await import("./requests.js");
  const {
    runShallowClone,
    runSparseCheckout,
    runBloblessClone,
    runTreelessClone,
    normalClone,
  } = await import("../../cloning.js");
  const { default:search } = await import("@inquirer/search");
  const { default:input } = await import("../gh/utils/input.js");

  if (!token) {
    console.log(chalk.yellow("No Token Found! Exiting Gracefully..."));
    process.exit(1);
  }
  const searchTerm = await input(chalk.greenBright("Search a GitLab Project ->"));
  const projects = await getProjects(token, searchTerm);

  const selectedProject = await promptProjectSelection(projects);
  projectInfo(selectedProject);

  const cloningPreference = await search({
    message: "Choose your prefered way to clone the repository",
    source: async (_input, { signal }) => {
      if (signal.aborted) {
        console.log(chalk.yellow("Aborted!"));
        process.exit(1);
      }
      return cloningOptions;
    },
  });

  if (cloningPreference === "partial") {
    const partialCloningPreference = await search({
      message: "Choose your preferred way to partially clone the repository",
      source: async (input, { signal }) => {
        if (signal.aborted) {
          console.log(chalk.yellow("Aborted!"));
          process.exit(1);
        }
        if (!input) {
          return partialCloningOptions;
        } else {
          const filteredChoices = partialCloningOptions.filter((choice) => choice.name.includes(input));
          return filteredChoices;
        }
      },
    });

    if (partialCloningPreference === "shallow") {
      await runShallowClone(selectedProject.url);
    } else if (partialCloningPreference === "treeless") {
      await runTreelessClone(selectedProject.url);
    } else if (partialCloningPreference === "sparse") {
      const selectedProjectContents = await (async () => {
        const selectedProjectAllContents = await getSingleProject(token, selectedProject.projectID, true);
        return selectedProjectAllContents.filter(content => content.type === "tree");
      })();
      const directoriesFromProjectContents = selectedProjectContents.map((content) => ({
        name: content.path,
        value: content.path,
      }));

      let pathToDirectory;
      try {
        pathToDirectory = await search({
          message:"Enter the directory you want to clone ->",
          source: async (_input, { signal }) => {
            if (signal.aborted) {
              console.log(chalk.yellow("Aborted!"));
              process.exit(1);
            }
            return directoriesFromProjectContents;
          },
        });
      await runSparseCheckout(selectedProject.url, '', '', pathToDirectory);
      } catch (error) {
        console.error(error.message);
        process.exit(1); 
      }
    } else {
      await runBloblessClone(selectedProject.url);
    }
  } else {
    await normalClone(selectedProject.url);
  }
}
