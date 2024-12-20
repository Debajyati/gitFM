/* OAuth Authentication with Device Flow */
import open, { apps } from "open";
import { createDeviceCode, exchangeDeviceCode } from "@octokit/oauth-methods";
import config from "./config.js";
import { promisify } from "node:util";
import { type as osType } from "os";
const sleep = promisify(setTimeout);

async function getOAuthenticationObject() {
  const {
    data: { device_code, user_code, verification_uri, interval },
  } = await createDeviceCode({
    clientType: "oauth-app",
    clientId: config.CLIENT_ID,
    scopes: ["repo", "user"], // oauth scopes
  });

  console.log(`\nYour OAuth User Code is - \n\t${user_code}\n`);
  await sleep(
    1500,
    console.log("Opening the Browser Window to Enter the User Code"),
  );
  console.log(
    "Waiting for the user to grant access through the browser ...",
  );
  try {
    if (osType() === "Windows_NT") {
      await open(verification_uri, { wait: true, app: { name: apps.browser } });
    } else {
      await open(verification_uri, { wait: true });
    }
  } catch (error) {
    console.error("Error opening browser:", error.message);
    console.log("Please manually open the following URL in your browser:");
    console.log(verification_uri);
    sleep(3000);
  }

  let currentInterval = interval;
  let remainingAttempts = 150;
  while (true) {
    remainingAttempts -= 1;
    if (remainingAttempts < 0) {
      console.error("User took too long to respond");
      return { error: "Request Timeout, try again"};
    }
    try {
      const { authentication } = await exchangeDeviceCode({
        clientType: "oauth-app",
        clientId: config.CLIENT_ID,
        code: device_code,
      });
      return authentication; // Exit loop and return authentication object
    } catch (error) {

      if (error.status === 400) {
        const errorCode = error.response.data.error;

        if (errorCode === "authorization_pending") {
          console.log("Authorization still pending... waiting before retrying");
          await sleep(currentInterval * 1000);
        } else if (errorCode === "slow_down") {
          console.log("Received slow_down response, increasing interval");
          currentInterval += 5; // Increase interval as per GitHub's requirement
          await sleep(currentInterval * 1000);
        } else if (errorCode === "expired_token") {
          return { error: errorCode }; // Exit loop as a new device code is needed
        } else if (errorCode === "incorrect_device_code") {
          return { error: errorCode }; // Exit loop as there is a fundamental error
        } else if (errorCode === "access_denied") {
          return { error: errorCode }; // Exit loop as the process cannot continue
        } else {
          return {error: `Unexpected 400 status error: ${errorCode}`}; // 400 status unknown errors
        }
      } else {
        console.error("An unexpected error occurred:", error.message);
        throw error; // Re-throw non-400 status unknown errors
      }
    }
  }
}

export { getOAuthenticationObject };
