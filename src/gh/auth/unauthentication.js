/*
 * for handling unauthentication and authentication error related issues 
 * */

export default {
  type: "unauthenticated",
  reason: (errorCode) => {
    if (errorCode === "access-denied") {
      return "User has denied the request. The authorization process has been canceled.";
    } else if (errorCode === "incorrect_device_code") {
      return "The device code provided is not valid.";
    } else if (errorCode === "expired_token") {
      return "The device code has expired. Please start the process again.";
    } else {
      return "The app's access has been revoked by GitHub!\n\t Or Unknown Error : (";
    }
  }
}
