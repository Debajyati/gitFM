import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import nodePlugin from "eslint-plugin-n";
import unicorn from "eslint-plugin-unicorn";
import importX from "eslint-plugin-import-x";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: {
      js,
      // 2. Node.js & CLI Specifics
      n: nodePlugin,

      // 3. General Quality & Best Practices
      unicorn: unicorn,
      "import-x": importX,
    },
    extends: ["js/recommended"],
    rules: {
      // 2. Node.js & CLI Specifics
      "n/no-unpublished-import": "error",
      "n/no-unpublished-require": "error",
      // Node.js rules for CLI tools [cite: 8, 9]
      "n/no-missing-import": "error",
      "n/no-process-exit": "off", // Often needed in CLI logic

      // Code smells and logic [cite: 13, 15, 16]
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
    },
    languageOptions: {
      globals: globals.node,
    },
  },
  tseslint.configs.recommended,
  prettierConfig,
  {
    files: ["eslint.config.ts"],
    rules: {
      "n/no-unpublished-import": "off",
    },
  },
]);
