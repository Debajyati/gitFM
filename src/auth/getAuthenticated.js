import { getAuthenticationObject } from "./authObject.js";
import { Octokit } from "@octokit/rest";
import chalk from "chalk";

const getLogin = async (token) => {
  const octokit = new Octokit({auth:token});
  const response = await octokit.rest.users.getAuthenticated();
  return response.data.login;
}

async function checkTokenValidity(token) {
  try {
    const userName = await getLogin(token); // If this works without errors, the token is valid
    if (userName.length > 0) {
      return true;      
    } else {
      return false;
    }
  } catch (error) {
    if (error.status === 401) {
      return false;
    } else {
      throw new Error("Error checking token:", error.message);
    }
  }
}

async function verifyAuthStatus(token, authStatus, reason) {
  try {
    if (token !== "NA") { // if token is available
      if (authStatus === "toBeAuthenticated") { // condition for personal access token
        const tokenIsValid = await checkTokenValidity(token);
        if (tokenIsValid) {
          console.log(chalk.greenBright(reason));
          console.log('provided token is valid.\n\tInitiating Authentication...');
          return "readyToBeAuthenticated";
        } else { // Invalid access token provided by user
          throw new Error("Invalid token: Access denied");
        }
      } else { // condition for oauth
        console.log(chalk.greenBright(reason));
        return authStatus;
      }
    } else { // condition for unsuccessful oauth
      console.error(reason);
      return authStatus;
    }
  } catch (err) { // condition for unknown errors
    console.error(err.message);
    process.exit(1);
  }
}

async function getVerifiedAuthToken(authType = "token") {
  if (authType === "oauth") {
    const { token, authStatus, reason } = await getAuthenticationObject("oauth");
    const currentAuthStatus = await verifyAuthStatus(token, authStatus, reason);
    if (currentAuthStatus === "unauthenticated") {
      process.exit(1);
    } else {
      const tokenData = { token:token, type:"oauth" };
      return tokenData;
    }
  } else {
    const {token, authStatus, reason } = await getAuthenticationObject("token");
    const currentAuthStatus = await verifyAuthStatus(token, authStatus, reason);
    if (currentAuthStatus === "readyToBeAuthenticated") {
      const tokenData = { token:token, type:"token" };
      return tokenData;
    } else {
      process.exit(1);
    }
  }
}

export {
  getVerifiedAuthToken, checkTokenValidity,
}
