# gitFM

gitFM is a command-line tool that can search GitHub/GitLab repositories, retrieve repository file contents and clone them normally or partially depending on your choice directly from the terminal(never leave the terminal). Your best friend for fetching repository as filesystem and easy cloning.

## Installation

First, make sure you have Node.js and git pre-installed in your system. Then install gitFM globally by running the following command:

```bash
npm install -g gitfm
```

## Usage

### Helptexts

Run `gitfm --help` or `gitfm -h` or `gitfm help` to know get the helptext. It will look like this -
![screenshot of the helptext](./assets/img/helptext.png)

To get more info about any individual command of gitfm, run - `gitfm help <command-name>`. For example, - if you want to know about the `clone` command in detail, you would run - `gitfm help clone`.

![screenshot of the clone command helptext](./assets/img/clone-helptext.png)

> [!NOTE]
> In the helptexts, - an argument enclosed within `[]` signify that the arg is optional and within `<>` signify that the arg is mandatory.

### Descriptions of the Individual Commands

- **`gitfm clone [options]`** :- This command has four options, - `--blobless`, `--treeless`, `--shallow` and `--sparse`. When none of them are provided, it proceeds to perform a normal(cloning the whole repository as usual) git clone of the provided repository URL. This command doesn't require any authentication. This is going to be your most helpful/used command of this application (most likely). `--shallow` option should be used when you want to clone only the latest commit of the repository. `--blobless` and `--treeless` options should be used when you want to clone a repository in a [blobless or treeless format](https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/#). The `--sparse` option should be used when you want to clone only the specified files or directories of the repository. The beauty of this command is that you can run it without installing the CLI (`npx gitfm clone <repourl> [options]`). For more info about the options, run `gitfm clone --help` or `gitfm help clone`.
- **`gitfm gh [options]`** :- This command has two options, - `--auth` and `--profile`. When none of them are provided, it will first check if you are already authenticated with GitHub. If you are, it will say so and exit. If you are not, it will ask you to login with your GitHub account(basically, the same as `gitfm gh --auth`). In case of browser login, a browser window/tab will be automatically opened with the verification URL if and only if your default browser is anything between **chrome**, **edge** or **firefox**. If your default browser is something else, the verification URL will be shown in the console so that you can manually open it in the browser to log in. After a successful login, the token is stored (base64 encoded) in the `$HOME` directory of your system in a config file named `.gitfmrc.json`. To delete your **PAT**, you should directly do that from your GitHub developer settings. Currently it is no longer possible to `revoke` or `reset` the oauth token. If the `--profile` option is used - shows a minimal view of your GitHub profile. This option takes no arguments. Requires you to be authenticated. If not, it will autostart interactive authentication mode. When authentication process will complete, it will show your profile info. For more info about the options, run `gitfm gh --help` or `gitfm help gh`.
- **`gitfm gl [options]`** :- This command also contains 3 options - `--login`, `--logout`, `--rotate`. You can authenticate gitfm with your Gitlab account only using a personal access token(**PAT**). Browser login is not supported and won't be implemented in future. The token is stored in a JSON file(`.gl.gitfmrc.json`) inside the `$HOME` directory of your system. For more info, run - `gitfm glauth -h` or `gitfm help glauth`.
- **`gitfm icl [options]`** :- This command has three options - `--gh`, `--gl` and `--unauthenticated`. When none of them are provided, it will do nothing.. If you want to interactively search and clone a GitHub repository, run `gitfm icl --gh`. If you want to interactively search and clone a GitLab repository, run `gitfm icl --gl`. If you want to run the legacy version of the GitHub repo interactive clone command(without partial cloning support but doesn't require authentication), run `gitfm icl --unauthenticated`. For more info about the options, run `gitfm icl --help` or `gitfm help icl`.
- **`gitfm ghs [TERM]`** :- This command gets a tabular list of GitHub repositories matching the given search term.
    - `--me`: Show only repositories owned by the current user.
    - `-p, --private`: Show only private repositories owned by the current user.
    - `-s, --starred`: Show only starred repositories.
    - `-u, --user <USER>`: Show only repositories owned by the given user.
    - `-l, --language <LANGUAGE>`: Show only repositories written in the given language.
    - `-t, --topic`: Show only repositories with the given topic.
    - `-r, --readme`: Show only repositories with terms matching in the README.

## Feedback

If you encounter any problems or have any suggestions when using gitFM, you are welcome to submit an issue in the [GitHub repository](https://github.com/Debajyati/gitFM).

## Star 🌟 This repo
Show some love to this project by starring it. It will help in increasing the visibility of this project and also in motivating me to work on this project more often. More features will be added to this project in the future. :)

## License
Internet Standard Consortium License (ISC)
