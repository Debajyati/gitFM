const { getVerifiedAuthToken, checkTokenValidity } = await import("./getAuthenticated.js");
const { Octokit } = await import("@octokit/rest");
const { saveToken } = await import("./tokenHelpers.js");
import config from "./config.js";

const authLoginInteractive = async () => {
  console.log("Choose your preferred way to authenticate\n\t 1. Browser Login with passcode, 2. personal access token");
  console.log("Enter 1 to begin Browser Login, otherwise token authentication will be initiated");

  const { default: input } = await import("../utils/input.js");
  const choice = await input("Enter your choice ->");

  try {
    const numberChoice = Number(choice);

    if (numberChoice === 1) {
      return await authLogin("oauth");
    } else if (isNaN(numberChoice)) {
      console.error("Invalid Input: Auth aborted!");
      process.exit(1);
    } else {
      return await authLogin("token");
    }

  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

const authLogin = async (authType) => {
  const tokenData =
    authType === "oauth"
      ? await getVerifiedAuthToken("oauth")
      : await getVerifiedAuthToken();
  saveToken(tokenData, config.TOKEN_FILE);
  const octokit = new Octokit({ auth: tokenData.token });
  return octokit;
};

export { authLoginInteractive, authLogin, checkTokenValidity };
