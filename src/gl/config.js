import path from "node:path";
import os from "os";

const config = {
  TOKEN_FILE: path.join(os.homedir(), '.gl.gitfmrc.json'),
};

export { config };
