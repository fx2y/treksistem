import sharedConfig from "../../tailwind.config.js";

/** @type {import('tailwindcss').Config} */
export default {
  ...sharedConfig,
  content: ["./src/**/*.{html,js,svelte,ts,tsx}", "./src/svelte/**/*.svelte"],
  plugins: [
    ...(!sharedConfig.plugins ? [] : sharedConfig.plugins),
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};
