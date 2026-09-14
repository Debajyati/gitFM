import path from "node:path";
import os from "node:os";

const GITLAB_CONFIG = {
  BASE_URL: "https://gitlab.com/api/v4",
  TOKEN_FILE: path.join(os.homedir(), ".gl.gitfmrc.json"),
} as const;

export { GITLAB_CONFIG };
