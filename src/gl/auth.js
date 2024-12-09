const { default:input} = await import('../gh/utils/input.js');
const { checkTokenIsValid } = await import('./requests.js');

const tokenAuthenticate = async () => {
  console.log('Create a new personal access token from your GitLab profile');
  console.log('Choose only the \'api\' scope from the checkboxes.');
  const token = await input('Enter the token here');
  return await checkTokenIsValid(token);
}

export { tokenAuthenticate };
