import { BaseApiClient } from '@treksistem/api-client';

import { browser } from '$app/environment';

export class MitraApiClient extends BaseApiClient {
	constructor(baseUrl = '/api') {
		super(baseUrl);

		// Load stored token in browser environment
		if (browser) {
			const token = this.getStoredToken();
			if (token) {
				this.setToken(token);
			}
		}
	}

	// Onboarding-specific methods
	async completeOnboarding(): Promise<{
		id: string;
		businessName: string;
		hasCompletedOnboarding: boolean;
	}> {
		return this.put('/mitra/profile/complete-onboarding', {});
	}

	async updateMitraProfile(data: {
		businessName: string;
		address?: string;
		phone?: string;
	}): Promise<{ id: string; businessName: string; address: string | null; phone: string | null }> {
		return this.put('/mitra/profile', data);
	}

	async createService(data: {
		name: string;
		baseFee: number;
		feePerKm: number;
	}): Promise<{ id: string; name: string; baseFee: number; feePerKm: number }> {
		return this.post('/mitra/services', data);
	}

	async inviteDriver(email: string): Promise<{ id: string; email: string; status: string }> {
		return this.post('/mitra/drivers/invite', { email });
	}
}

export const apiClient = new MitraApiClient();
