import input from '../gh/utils/input.js';

const baseURL = "https://https://gitlab.com/api/v4";

const tokenAuthenticate = async () => {
  console.log('Create a new personal access token from your GitLab profile');
  console.log('Choose only \'api\' or both \'read_api\' and \'read-user\' from the checkboxes.');
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
      console.error("invalid access token: Authorization aborted!");
      process.exit(1);
    } else {
      console.log(data);
      return token;
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

export { tokenAuthenticate };
