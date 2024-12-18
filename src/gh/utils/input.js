import inputPrompt from "@inquirer/input";
import chalk from "chalk";

async function input(message) {
  try {
    return await inputPrompt({ message });
  } catch (err) {
      console.log(chalk.yellow("Aborted! Exiting Gracefully..."));
      process.exit(1);
  }
}

export default input;
