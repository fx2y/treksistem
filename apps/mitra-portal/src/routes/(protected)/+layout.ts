import { redirect } from '@sveltejs/kit';

import type { LayoutLoad } from './$types';

import { browser } from '$app/environment';

export const load: LayoutLoad = async () => {
	if (browser) {
		const token = localStorage.getItem('auth_token');
		if (!token) {
			throw redirect(302, '/login');
		}
	}

	return {};
};
