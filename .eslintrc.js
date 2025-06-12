module.exports = {
  extends: ["@treksistem/eslint-config-custom"],
  ignorePatterns: ["node_modules/", "dist/", ".turbo/", ".svelte-kit/"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "@next/next/no-html-link-for-pages": "off",
  },
};
