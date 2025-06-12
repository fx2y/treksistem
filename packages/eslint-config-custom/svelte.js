module.exports = {
  extends: ["@treksistem/eslint-config-custom", "plugin:svelte/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "svelte"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    extraFileExtensions: [".svelte"],
  },
  overrides: [
    {
      files: ["*.svelte"],
      parser: "svelte-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
    },
  ],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "svelte/valid-compile": "error",
    "svelte/no-at-debug-tags": "warn",
    "svelte/no-reactive-functions": "error",
    "svelte/no-reactive-literals": "error",
  },
};
