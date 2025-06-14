import { hc } from 'hono/client';
import type { AppType } from '../../apps/api/src/index';

export interface ClientConfig {
  baseUrl?: string;
  token?: string;
}

export class TypedApiClient {
  private client: ReturnType<typeof hc<AppType>>;
  private token: string | null = null;

  constructor(config: ClientConfig = {}) {
    const baseUrl = config.baseUrl || 'http://localhost:8787';
    
    this.client = hc<AppType>(baseUrl, {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        
        if (this.token) {
          headers.set('Authorization', `Bearer ${this.token}`);
        }
        
        return fetch(input, {
          ...init,
          headers,
        });
      },
    });

    if (config.token) {
      this.setToken(config.token);
    }
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token || this.getStoredToken();
  }

  private getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('auth_token') ||
        sessionStorage.getItem('auth_token')
      );
    }
    return null;
  }

  setStoredToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  removeStoredToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
    }
  }

  // Expose the typed API client
  get api() {
    return this.client.api;
  }

  // Auth methods
  get auth() {
    return this.client.api.auth;
  }

  // Mitra methods
  get mitra() {
    return this.client.api.mitra;
  }

  // Driver methods
  get driver() {
    return this.client.api.driver;
  }

  // Public methods
  get public() {
    return this.client.api.public;
  }

  // Admin methods
  get admin() {
    return this.client.api.admin;
  }

  // Uploads methods
  get uploads() {
    return this.client.api.uploads;
  }

  // Notifications methods
  get notifications() {
    return this.client.api.notifications;
  }

  logout(): void {
    this.removeStoredToken();
  }
}

// Create a default instance
export const apiClient = new TypedApiClient();

// Export types for convenience
export type ApiClientType = TypedApiClient;