import type { AppType } from "@treksistem/api";
import { hc } from "hono/client";

export interface ClientConfig {
  baseUrl?: string;
  token?: string;
  refreshToken?: string;
  onTokenRefresh?: (newToken: string, newRefreshToken: string) => void;
  onAuthError?: () => void;
}

export class TypedApiClient {
  private client: ReturnType<typeof hc<AppType>>;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private onTokenRefresh?: (newToken: string, newRefreshToken: string) => void;
  private onAuthError?: () => void;

  constructor(config: ClientConfig = {}) {
    const baseUrl = config.baseUrl || "http://localhost:8787";

    this.client = hc<AppType>(baseUrl, {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);

        // Add current token if available
        const currentToken = this.token || this.getStoredToken();
        if (currentToken) {
          headers.set("Authorization", `Bearer ${currentToken}`);
        }

        const response = await fetch(input, {
          ...init,
          headers,
        });

        // Handle 401 responses by attempting token refresh
        if (
          response.status === 401 &&
          !this.isRefreshing &&
          this.refreshToken
        ) {
          const refreshed = await this.attemptTokenRefresh();
          if (refreshed) {
            // Retry the original request with new token
            const newHeaders = new Headers(init?.headers);
            newHeaders.set("Authorization", `Bearer ${this.token}`);

            return fetch(input, {
              ...init,
              headers: newHeaders,
            });
          }
        }

        return response;
      },
    });

    this.onTokenRefresh = config.onTokenRefresh;
    this.onAuthError = config.onAuthError;

    if (config.token) {
      this.setToken(config.token);
    }

    if (config.refreshToken) {
      this.setRefreshToken(config.refreshToken);
    }
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  setRefreshToken(refreshToken: string | null): void {
    this.refreshToken = refreshToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken || this.getStoredRefreshToken();
  }

  getToken(): string | null {
    return this.token || this.getStoredToken();
  }

  private getStoredToken(): string | null {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token")
      );
    }
    return null;
  }

  private getStoredRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("refresh_token") ||
        sessionStorage.getItem("refresh_token")
      );
    }
    return null;
  }

  setStoredToken(token: string): void {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  setStoredRefreshToken(refreshToken: string): void {
    this.refreshToken = refreshToken;
    if (typeof window !== "undefined") {
      localStorage.setItem("refresh_token", refreshToken);
    }
  }

  setTokens(token: string, refreshToken: string): void {
    this.setStoredToken(token);
    this.setStoredRefreshToken(refreshToken);
  }

  removeStoredToken(): void {
    this.token = null;
    this.refreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("refresh_token");
    }
  }

  private async attemptTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing) {
      return false;
    }

    this.isRefreshing = true;

    try {
      const currentRefreshToken =
        this.refreshToken || this.getStoredRefreshToken();
      if (!currentRefreshToken) {
        return false;
      }

      const response = await fetch(this.client.api.auth.refresh.$url(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-refresh-token": currentRefreshToken,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.accessToken && data.refreshToken) {
          this.setTokens(data.accessToken, data.refreshToken);

          // Notify callback if provided
          if (this.onTokenRefresh) {
            this.onTokenRefresh(data.accessToken, data.refreshToken);
          }

          return true;
        }
      }

      // Refresh failed, clear tokens and notify
      this.removeStoredToken();
      if (this.onAuthError) {
        this.onAuthError();
      }

      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.removeStoredToken();
      if (this.onAuthError) {
        this.onAuthError();
      }
      return false;
    } finally {
      this.isRefreshing = false;
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

  async logout(): Promise<void> {
    try {
      const refreshToken = this.refreshToken || this.getStoredRefreshToken();
      if (refreshToken) {
        // Call logout endpoint to invalidate tokens on server
        await fetch(this.client.api.auth.logout.$url(), {
          method: "POST",
          headers: {
            "x-refresh-token": refreshToken,
          },
        });
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Always clear local tokens regardless of API call result
      this.removeStoredToken();
    }
  }

  isAuthenticated(): boolean {
    return !!(this.token || this.getStoredToken());
  }
}

// Create a default instance
export const apiClient = new TypedApiClient();

// Export types for convenience
export type ApiClientType = TypedApiClient;
