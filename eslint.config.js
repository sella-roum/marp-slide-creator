import tsParser from "@typescript-eslint/parser";
import tsPlugin  from "@typescript-eslint/eslint-plugin";
import prettier   from "eslint-plugin-prettier";

export default {
  ignores: [
    ".next/",
    "node_modules/",
    "build/",
    "out/",
    "public/",
    "*.config.js",
    "*.config.mjs"
  ],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: { jsx: true },
      project: "./tsconfig.json",
    },
  },
  plugins: {
    "@typescript-eslint": tsPlugin,
    prettier: prettier,
  },
  extends: [
    "eslint:recommended",
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  rules: {
    "prettier/prettier": "warn",
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
};
