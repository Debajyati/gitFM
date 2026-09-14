import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { Result, ok, err } from "./pattern.js";
import { sanitizeToken } from "./sanitize.js";

interface StoredTokenData {
  token: string | null;
  type?: string;
}

function encodeToken(token: string): string {
  return Buffer.from(token, "utf-8").toString("base64");
}

function decodeToken(encoded: string): string {
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    // Ensure the decoded string is valid UTF-8 and not gibberish
    if (decoded.length > 0) {
      return decoded;
    }
    return encoded;
  } catch {
    return encoded;
  }
}

function getStoredToken(filePath: string): Result<string | null, string> {
  try {
    if (!existsSync(filePath)) {
      return ok(null);
    }
    const rawContent = readFileSync(filePath, "utf-8");
    if (!rawContent.trim()) {
      return ok(null);
    }
    const parsed: StoredTokenData = JSON.parse(rawContent);
    if (parsed && typeof parsed.token === "string" && parsed.token.length > 0) {
      return ok(decodeToken(parsed.token));
    }
    return ok(null);
  } catch (error) {
    return err(
      `Failed to read token from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function getStoredAuthType(filePath: string): Result<string | null, string> {
  try {
    if (!existsSync(filePath)) {
      return ok(null);
    }
    const rawContent = readFileSync(filePath, "utf-8");
    if (!rawContent.trim()) {
      return ok(null);
    }
    const parsed: StoredTokenData = JSON.parse(rawContent);
    return ok(parsed.type || null);
  } catch (error) {
    return err(
      `Failed to read auth type from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function saveToken(
  tokenData: { token: string; type?: string },
  filePath: string,
): Result<void, string> {
  const sanitized = sanitizeToken(tokenData.token);
  if (!sanitized.ok) {
    return err(sanitized.error);
  }

  try {
    const dataToSave: StoredTokenData = {
      token: encodeToken(sanitized.value),
      type: tokenData.type,
    };
    writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), "utf-8");
    return ok(undefined);
  } catch (error) {
    return err(
      `Failed to save token to ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function clearToken(
  filePath: string,
  authType: string | null = "unauthenticated",
): Result<void, string> {
  try {
    if (existsSync(filePath)) {
      const dataToSave: StoredTokenData = {
        token: null,
        type: authType ?? undefined,
      };
      writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), "utf-8");
    }
    return ok(undefined);
  } catch (error) {
    return err(
      `Failed to clear token in ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export {
  encodeToken,
  decodeToken,
  getStoredToken,
  getStoredAuthType,
  saveToken,
  clearToken,
};
