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

export { cloningOptions, partialCloningOptions };
