// JSON import of the config file containing the token
const configJson = await (async ()=>{
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  return require("./config.json");
})();

const CONFIG_FILE = await (async () => {
  const {default:path} = await import("node:path");
  const dirname  = import.meta.dirname;
  path.join(dirname, "config.json")
})(); // file path

const baseURL = "https://gitlab.com/api/v4";

async function fetchErrorHandlerCallback(error) {
  if (typeof error.json === "function") {
    try {
      const jsonError = await error.json();
      console.error("Json error from API");
      console.log(jsonError);
    } catch (genericError) {
      console.error("Generic error from API");
      console.log(genericError.statusText);
    }
  } else {
    console.error("Fetch error");
    console.log(error);
  }
}

async function revokeToken(token) {
  const url = `${baseURL}/personal_access_tokens/self`;
  try {
    const response = await fetch(`${url}?${new URLSearchParams({ "expires_at" : expirationDate }).toString()}`, {
      method: "DELETE",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });
    const data = await response.json();

    if (data.message === "204: No Content") {
      return "successful";
    } else if (data.message === "400: Bad Request") {
      return "unsuccessful";
    } else if (data.message === "401: Unauthorized") {
      return "invalid";
    }
  } catch (error) {
    await fetchErrorHandlerCallback(error);
  }
}

async function rotateToken(token, expirationDate) {
  const url = `${baseURL}/personal_access_tokens/self/rotate`;

  try {
    const response = await fetch(
      `${url}?${new URLSearchParams({ expires_at: expirationDate }).toString()}`,
      {
        method: "POST",
        headers: {
          "PRIVATE-TOKEN": token,
        }
      }
    );
    if (response.ok) {
      const data = await response.json();
      console.log("Token Rotated Successfully!");
      return data.token;
    } else {
      if (response.status === 400) {
        console.error("Not Rotated Successfully");
        process.exit(1);
      } else if (response.status === 401) {
        console.error("Either The Token Has Expired Or Has Been Revoked Already");
        process.exit(1);
      } else if (response.status === 403) {
        console.error("The Token Is Not Allowed To Rotate Itself");
        process.exit(1);
      } else if (response.status === 405) {
        console.error("The Token Is Not A Personal Access Token");
        process.exit(1);
      } else {
        console.error(`Unknown Status ${response.status} Error Occurred!`);
        process.exit(1);
      }
    }
  } catch (error) {
    await fetchErrorHandlerCallback(error);
  }
}

export {
  CONFIG_FILE,
  configJson,
  revokeToken,
  rotateToken,
}
