import input from '../gh/utils/input.js';

const baseURL = "https://gitlab.com/api/v4";

const tokenAuthenticate = async () => {
  console.log('Create a new personal access token from your GitLab profile');
  console.log('Choose both \'read_api\' and \'read-user\' scopes from the checkboxes.');
  const token = await input('Enter the token here');

  const url = `${baseURL}/personal_access_tokens`;

  try {
    const response = await fetch(url,{
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });

    const data = await response.json();

    if (data.message === "401 Unauthorized") {
      console.error("invalid access token: Authentication aborted!");
      process.exit(1);
    } else {
      console.log("Authentication Successful");
      return token;
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { tokenAuthenticate };
