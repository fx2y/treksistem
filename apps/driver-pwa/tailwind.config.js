import sharedConfig from "../../tailwind.config.js";

/** @type {import('tailwindcss').Config} */
export default {
  ...sharedConfig,
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "../../packages/ui/src/**/*.{html,js,svelte,ts}",
  ],
};
