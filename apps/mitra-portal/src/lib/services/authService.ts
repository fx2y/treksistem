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
		const code = urlParams.get('code');
		const state = urlParams.get('state');
		const error = urlParams.get('error');

		if (error) {
			console.error('Authentication error:', error);
			await goto('/login?error=' + encodeURIComponent(error));
			return;
		}

		if (code && state) {
			try {
				const tokenResponse = await fetch(`/api/auth/callback/google?code=${code}&state=${state}`);
				if (!tokenResponse.ok) {
					throw new Error('Token exchange failed');
				}

				const { accessToken, refreshToken } = await tokenResponse.json();
				apiClient.setTokens(accessToken, refreshToken);

				const userData = await this.getAuthUser();
				user.set(userData);
				await goto('/dashboard');
			} catch (err) {
				console.error('Failed to handle callback:', err);
				await goto('/login?error=' + encodeURIComponent('Authentication failed'));
			}
		} else {
			await goto('/login?error=' + encodeURIComponent('Missing authentication parameters'));
		}
	}

	static async getAuthUser(): Promise<AuthUser> {
		return apiClient.get<AuthUser>('/auth/me');
	}

	static async logout(): Promise<void> {
		apiClient.setToken(null);
		user.set(null);
		if (browser) {
			await goto('/login');
		}
	}

	static async initializeAuth(): Promise<void> {
		if (!browser) return;

		const token = localStorage.getItem('auth_token');
		const refreshToken = localStorage.getItem('refresh_token');

		if (token) {
			apiClient.setToken(token);
			if (refreshToken) {
				apiClient.setRefreshToken(refreshToken);
			}

			try {
				const userData = await this.getAuthUser();
				user.set(userData);
			} catch (err) {
				console.error('Failed to restore authentication:', err);
				apiClient.logout();
				user.set(null);
			}
		}
	}
}
