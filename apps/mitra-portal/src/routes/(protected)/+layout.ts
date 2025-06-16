import { redirect } from '@sveltejs/kit';

import type { LayoutLoad } from './$types';

import { browser } from '$app/environment';
import { AuthService } from '$lib/services/authService';

export const load: LayoutLoad = async () => {
	if (browser) {
		try {
			await AuthService.initializeAuth();
			const token = localStorage.getItem('auth_token');
			if (!token) {
				throw redirect(302, '/login');
			}
		} catch (error) {
			console.error('Authentication initialization failed:', error);
			throw redirect(302, '/login');
		}
	}

	return {};
};
