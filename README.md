# gitFM

gitFM is a command-line tool based on Node.js that searches the GitHub repository, retrieves repository file structures, and creates repository files.

## Installation

First, make sure you have installed Node.js. Then install gitFM globally by running the following command:

```bash
npm install -g gitfm
gitfm
```

or, run it without locally installing it -

```bash
npx gitfm
```

## How to use

gitFM has a simple command line interface that guides you through the process of searching, selecting, and operating the repository.

### Search Repositories

When you run gitFM, it will prompt you to enter a search keyword. For example, if you want to search for a repository with the name "express", you can enter:

```bash
express
```

 in the search input.

### Select Repository

gitFM returns a list of search results. You can select one from the Repository list.

**NOTE:** There's no reverse motion support for now. Means once you enter in the list of repos after the search input you can't go back to the search input.

### View Repositories contents

After selecting a Repo, gitFM will display detailed information about the Repo, including the Repositories name, description, and GitHub link. You can continue viewing the contents of .

### Clone Repositories

If you select a Repository, gitFM will prompt you to agree cloning the Repository locally. For example, if you want to create a repository in the "my-repo" directory, you can specify:

```bash
my-repo
```
in the next input prompt where it will ask you if want to clone into a specific directory.

## Summary: 
gitFM is a convenient command-line tool that can be used to search, view and clone GitHub Repositories. Through this tool, you can easily browse and explore the code repository on GitHub from you fav commandline.

## Feedback and contributions

If you encounter any problems or have any suggestions when using gitFM, you are welcome to submit an issue or pull request in the GitHub repository.

GitHub repository: https://github.com/Debajyati/gitFM
