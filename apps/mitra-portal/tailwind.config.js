import sharedConfig from '../../tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
	...sharedConfig,
	content: ['./src/**/*.{html,js,svelte,ts}', '../../packages/ui/src/**/*.{html,js,svelte,ts}'],
	plugins: [
		...(!sharedConfig.plugins ? [] : sharedConfig.plugins),
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('@tailwindcss/forms'),
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('@tailwindcss/typography')
	]
};
