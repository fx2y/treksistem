module.exports = {
  extends: ["@treksistem/eslint-config-custom"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
  },
};
