import { api } from '@treksistem/api-client';
import { writable } from 'svelte/store';

import { browser } from '$app/environment';
import { goto } from '$app/navigation';

interface AuthUser {
	id: string;
	email: string;
	name: string;
	role: string;
	mitraId?: string;
	mitra?: { id: string; name: string; businessType: string };
}

interface AuthState {
	user: AuthUser | null;
	isAuthenticated: boolean;
	loading: boolean;
}

const initialState: AuthState = {
	user: null,
	isAuthenticated: false,
	loading: false
};

export const authStore = writable<AuthState>(initialState);

export const authActions = {
	async initializeAuth(): Promise<void> {
		if (!browser) return;

		authStore.update((state) => ({ ...state, loading: true }));

		try {
			const response = await api.auth.me.get();
			if (response.data) {
				authStore.update((state) => ({
					...state,
					user: response.data,
					isAuthenticated: true,
					loading: false
				}));
			}
		} catch (error) {
			console.error('Failed to restore authentication:', error);
			authStore.update((state) => ({ ...state, loading: false }));
		}
	},

	loginWithGoogle(): void {
		if (browser) {
			window.location.href = '/api/auth/login/google';
		}
	},

	async handleCallback(): Promise<void> {
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
			try {
				const response = await api.auth.me.get();
				if (response.data) {
					authStore.update((state) => ({
						...state,
						user: response.data,
						isAuthenticated: true
					}));
					await goto('/dashboard');
				}
			} catch (err) {
				console.error('Failed to get user data:', err);
				await goto('/login?error=' + encodeURIComponent('Failed to authenticate'));
			}
		} else {
			await goto('/login?error=' + encodeURIComponent('No authentication token received'));
		}
	},

	async logout(): Promise<void> {
		try {
			await api.auth.logout.post();
		} catch (error) {
			console.error('Logout error:', error);
		}

		authStore.set(initialState);
		if (browser) {
			await goto('/login');
		}
	}
};
