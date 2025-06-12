import unauthentication from "./unauthentication.js";

async function getAuthenticationObject(authType = "token") {
  try {
    if (authType === "oauth") {
      const { getOAuthenticationObject } = await import("./oauth.js");
      const oAuthObject = await getOAuthenticationObject();
      if (Object.prototype.hasOwnProperty.call(oAuthObject,'error')) {
        return {
          authStatus: unauthentication.type,
          reason: unauthentication.reason(oAuthObject.error),
          token: "NA",
        }
      } else {
        return {
          authStatus: "authenticated",
          reason: "user authorized via Device Flow in Browser",
          token: oAuthObject.token,
        }
      }
    } else {
      const { default:input } = await import("../utils/input.js");
      const { promisify } = await import("node:util");
      const sleep = promisify(setTimeout);

      console.log('Create a new personal access token from your GitHub Developer Settings');
      console.log(`Check only these scopes from the checkboxes when creating the token - \n\t${['repo', 'user']} `);

      const personalAcessToken = await sleep(2000, await input("Enter the personal access token "));
      
      return {
        authStatus: "toBeAuthenticated",
        reason: "user provided personal access token",
        token: personalAcessToken,
      };
    }
  } catch (err) {
    return {
      authStatus: unauthentication.type,
      reason: err.message,
      token: "NA",
    };
  }
}

export { getAuthenticationObject };
