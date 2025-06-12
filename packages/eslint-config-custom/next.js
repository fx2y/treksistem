module.exports = {
  extends: ["@treksistem/eslint-config-custom", "next"],
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@next/next/no-html-link-for-pages": "off",
  },
};
