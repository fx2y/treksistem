import { browser } from '$app/environment';

export class ApiClient {
	private baseUrl: string;
	private authToken: string | null = null;

	constructor(baseUrl = '/api') {
		this.baseUrl = baseUrl;

		// Get auth token from localStorage if in browser
		if (browser) {
			this.authToken = localStorage.getItem('auth_token');
		}
	}

	setAuthToken(token: string | null) {
		this.authToken = token;
		if (browser) {
			if (token) {
				localStorage.setItem('auth_token', token);
			} else {
				localStorage.removeItem('auth_token');
			}
		}
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...(options.headers as Record<string, string>)
		};

		if (this.authToken) {
			headers.Authorization = `Bearer ${this.authToken}`;
		}

		const response = await fetch(url, {
			...options,
			headers
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`API Error: ${response.status} ${errorText}`);
		}

		// Handle empty responses
		const text = await response.text();
		if (!text) return {} as T;

		try {
			return JSON.parse(text);
		} catch {
			return text as unknown as T;
		}
	}

	async get<T>(endpoint: string, params?: URLSearchParams): Promise<T> {
		const url = params ? `${endpoint}?${params.toString()}` : endpoint;
		return this.request<T>(url);
	}

	async post<T>(endpoint: string, body: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: JSON.stringify(body)
		});
	}

	async put<T>(endpoint: string, body: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: JSON.stringify(body)
		});
	}

	async del(endpoint: string): Promise<void> {
		await this.request(endpoint, {
			method: 'DELETE'
		});
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

export const apiClient = new ApiClient();
