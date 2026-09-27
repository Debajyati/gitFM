import cfonts from "cfonts";
import chalk from "chalk";
import inputPrompt from "@inquirer/input";
import searchPrompt from "@inquirer/search";

function getRandomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getHeaderText(): string {
  const fontStyles: Array<
    "chrome" | "slick" | "grid" | "shade" | "tiny" | "pallet"
  > = ["chrome", "slick", "grid", "shade", "tiny", "pallet"];
  const randomFontStyle =
    fontStyles[getRandomIntInclusive(0, fontStyles.length - 1)];

  const renderResult = cfonts.render("GITFM", {
    font: randomFontStyle,
    align: "center",
    colors: ["greenBright", "magentaBright", "redBright"],
    background: "transparent",
    letterSpacing: 1,
    lineHeight: 1,
    space: true,
    maxLength: "0",
    gradient: true,
    independentGradient: false,
    transitionGradient: false,
    rawMode: false,
    env: "node",
  });

  const res = renderResult as { string?: string } | false;
  if (res && typeof res.string === "string") {
    return res.string;
  }
  return "GITFM";
}

async function promptInput(message: string): Promise<string> {
  try {
    return await inputPrompt({ message });
  } catch {
    console.log(chalk.yellow("Aborted! Exiting Gracefully..."));
    process.exit(1);
  }
}

interface ChoiceItem<T> {
  name: string;
  value: T;
  description?: string;
}

async function promptSelection<T>(
  choices: Array<ChoiceItem<T>>,
  message: string,
): Promise<T> {
  try {
    return await searchPrompt({
      message,
      source: async (input, { signal }) => {
        if (signal.aborted) {
          console.log(chalk.yellow("Aborted!"));
          process.exit(1);
        }
        if (!input) {
          return choices;
        }
        const query = input.toLowerCase();
        return choices.filter(
          (choice) =>
            choice.name.toLowerCase().includes(query) ||
            choice.description?.toLowerCase().includes(query),
        );
      },
    });
  } catch {
    console.log(chalk.yellow("Aborted! Exiting Gracefully..."));
    process.exit(1);
  }
}

function displayRepoInfo(repo: {
  name: string;
  description: string | null;
  url?: string;
  html_url?: string;
}): void {
  const repoUrl = repo.url || repo.html_url || "";
  console.log("");
  console.log(
    chalk.bgGreenBright(chalk.black("repo name :")),
    "\t",
    chalk.bold(repo.name),
    "\n",
  );
  console.log(
    chalk.bgGreenBright(chalk.black("Description :")),
    "\t",
    chalk.bold(repo.description || "No description provided"),
    "\n",
  );
  console.log(
    chalk.bgGreenBright(chalk.black("URL :")),
    "\t",
    chalk.bold(chalk.underline(repoUrl)),
    "\n",
  );
}

function renderFolderContents(
  contents: Array<{ name: string; type: string }>,
  indent = "  ",
): void {
  for (const item of contents) {
    if (item.type === "dir" || item.type === "tree") {
      console.log(
        `${indent}`,
        chalk.bgCyanBright(chalk.black(item.name)),
        chalk.blueBright("/"),
      );
    } else {
      console.log(`${indent}${item.name}`);
    }
  }
}

export {
  getHeaderText,
  promptInput,
  promptSelection,
  displayRepoInfo,
  renderFolderContents,
};
export type { ChoiceItem };
