import input from '../gh/utils/input.js';

const baseURL = "https://gitlab.com/api/v4";

const checkTokenIsValid = async (token) => {
  const url = `${baseURL}/personal_access_tokens`;

  try {
    const response = await fetch(url,{
      method: "GET",
      headers: {
        "PRIVATE-TOKEN": token,
      }
    });

    if (response.status === 401) {
      console.error("invalid access token: Aborted!");
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

const tokenAuthenticate = async () => {
  console.log('Create a new personal access token from your GitLab profile');
  console.log('Choose only the \'api\' scope from the checkboxes.');
  const token = await input('Enter the token here');
  return await checkTokenIsValid(token);
}

export { tokenAuthenticate };
