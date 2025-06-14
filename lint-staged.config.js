module.exports = {
  "!(scripts)/**/*.{js,ts,tsx,jsx}": ["eslint --fix", "prettier --write"],
  "*.{js,ts,tsx,jsx}": ["prettier --write"],
  "*.{json,md,css,html,yaml,yml}": ["prettier --write"],
};
