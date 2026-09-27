import path from "node:path";
import os from "node:os";

const GITHUB_CONFIG = {
  CLIENT_ID: "Ov23liEZlvbyKNsSPB1n",
  TOKEN_FILE: path.join(os.homedir(), ".gitfmrc.json"),
  SCOPES: ["repo", "user"],
} as const;

export { GITHUB_CONFIG };
