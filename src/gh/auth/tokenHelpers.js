import { existsSync, readFileSync, writeFileSync } from "fs";

// Check if a stored token exists
function getStoredToken(TOKEN_FILE) {
  if (existsSync(TOKEN_FILE)) {
    const tokenData = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
    if (tokenData && tokenData.token) {
      return tokenData.token;
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
  writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
}

// Clear token from storage and set type to unauthenticated
function clearToken(TOKEN_FILE) {
  if (existsSync(TOKEN_FILE)) {
    const dataToSave = {
      token: null,
      type: "unauthenticated"
    };
    writeFileSync(TOKEN_FILE, JSON.stringify(dataToSave, null, 2));
  }
}

export { getStoredToken, getStoredAuthType, saveToken, clearToken };

