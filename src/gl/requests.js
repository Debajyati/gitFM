// JSON import of the config file containing the token
const configJson = await (async ()=>{
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  return require("./config.json");
})();

const CONFIG_FILE = await (async () => {
  const {default:path} = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const dirname  = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dirname, "config.json");
})(); // file path

const baseURL = "https://gitlab.com/api/v4";

async function revokeToken(token) {
  const url = `${baseURL}/personal_access_tokens/self`;
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });

    if (response.status === 204) {
      return "successful";
    } else if (response.status === 400) {
      return "unsuccessful";
    } else if (response.status === 401) {
      return "invalid";
    }
  } catch (error) {
    console.error("Fetch Error");
    console.log(error);
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
    console.error("Fetch Error");
    console.log(error);
  }
}

async function userProfile(token) {
  const { default: boxen } = await import("boxen");
  const { default: chalk } = await import("chalk");
  const url = `${baseURL}/user`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": token,
      },
    });

    if (response.ok) {
      const { name, bio } = await response.json();
      const profileInfo = `
  Hello, - ${name}!
  ${bio}
  `;
      console.log(boxen(profileInfo,
        {title: `${chalk.bgGreenBright('profile')}`, titleAlignment: 'center'}
      ));
    } else {
      console.log(`Request Returned Status ${response.status} Error`);
      process.exit(1);
    }

  } catch (error) {
    console.error("Fetch Error");
    console.log(error);
  }
}

async function getProjects(token, searchTerm) {
  const url = `${baseURL}/search?scope=projects&search=${searchTerm}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });

    if (response.ok) {
      const data = await response.json();

      const projectsList = data.map((project) => ({
        name: project.path_with_namespace,
        description: project.descriptions,
        url: project.http_url_to_repo,
        projectID: project.id,
      }));

      return projectsList;
    } else {
      console.error(response.statusText);
      console.error(`Request Returned Status ${response.status} Error`);
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export {
  CONFIG_FILE,
  configJson,
  revokeToken,
  rotateToken,
  userProfile,
  getProjects,
}
