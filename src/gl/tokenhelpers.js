import { existsSync, writeFileSync } from "fs";

// Save token and the authType to a file with type key
function saveToken(tokenData, CONFIG_FILE) {
  writeFileSync(CONFIG_FILE, JSON.stringify(tokenData, null, 2));
}

// Clear token from storage
function clearToken(CONFIG_FILE) {
  if (existsSync(CONFIG_FILE)) {
    const dataToSave = {
      token: null,
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(dataToSave, null, 2));
  }
}

export { saveToken, clearToken };

