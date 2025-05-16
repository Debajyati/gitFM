import { existsSync, readFileSync, writeFileSync } from "fs";
import converter from "../../base64.js";

// Check if a stored token exists
function getStoredToken(TOKEN_FILE) {
  if (existsSync(TOKEN_FILE)) {
    const tokenData = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
    if (tokenData && tokenData.token) {
      return converter.btoa(tokenData.token);
    }
  } else {
    return null;
  }
}

function getStoredAuthType(TOKEN_FILE) {
  if (existsSync(TOKEN_FILE)) {
    const tokenData = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
    if (tokenData && tokenData.type) {
      return tokenData.type;
    }
  } else {
    return null;
  }
}

// Save token and the authType to a file with type key
function saveToken(tokenData, TOKEN_FILE) {
  tokenData.token = converter.atob(tokenData.token);
  writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
}

// Clear token from storage and set type to unauthenticated
function clearToken(TOKEN_FILE) {
  if (existsSync(TOKEN_FILE)) {
    const dataToSave = {
      token: null,
      type: "unauthenticated",
    };
    writeFileSync(TOKEN_FILE, JSON.stringify(dataToSave, null, 2));
  }
}

export { getStoredToken, getStoredAuthType, saveToken, clearToken };
