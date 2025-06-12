module.exports = {
  extends: ["@treksistem/eslint-config-custom"],
  env: {
    browser: true,
  },
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
  },
};
