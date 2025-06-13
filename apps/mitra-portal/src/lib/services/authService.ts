import { writable } from 'svelte/store';

import { apiClient } from './apiClient';

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { AuthUser } from '$lib/types/auth';

export const user = writable<AuthUser | null>(null);

export class AuthService {
	static loginWithGoogle(): void {
		if (browser) {
			window.location.href = '/api/auth/login/google';
		}
	}

	static async handleCallback(): Promise<void> {
		if (!browser) return;

		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get('token');
		const error = urlParams.get('error');

		if (error) {
			console.error('Authentication error:', error);
			await goto('/login?error=' + encodeURIComponent(error));
			return;
		}

		if (token) {
			apiClient.setAuthToken(token);

			try {
				const userData = await this.getAuthUser();
				user.set(userData);
				await goto('/dashboard');
			} catch (err) {
				console.error('Failed to get user data:', err);
				await goto('/login?error=' + encodeURIComponent('Failed to authenticate'));
			}
		} else {
			await goto('/login?error=' + encodeURIComponent('No authentication token received'));
		}
	}

	static async getAuthUser(): Promise<AuthUser> {
		return apiClient.get<AuthUser>('/auth/me');
	}

	static async logout(): Promise<void> {
		apiClient.setAuthToken(null);
		user.set(null);
		if (browser) {
			await goto('/login');
		}
	}

	static async initializeAuth(): Promise<void> {
		if (!browser) return;

		const token = localStorage.getItem('auth_token');
		if (token) {
			apiClient.setAuthToken(token);
			try {
				const userData = await this.getAuthUser();
				user.set(userData);
			} catch (err) {
				console.error('Failed to restore authentication:', err);
				apiClient.setAuthToken(null);
			}
		}
	}
}
