import { error } from '@sveltejs/kit';

import type { PageLoad } from './$types';

import { MitraProfileClientService } from '$lib/services/mitraProfileService';

export const load: PageLoad = async () => {
	try {
		const profile = await MitraProfileClientService.getProfile();
		return {
			profile
		};
	} catch (err) {
		console.error('Failed to load profile:', err);
		throw error(500, 'Failed to load profile data');
	}
};
