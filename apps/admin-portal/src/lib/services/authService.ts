import { adminApiClient } from "./apiClient";

import { goto } from "$app/navigation";

export class AdminAuthService {
  private static instance: AdminAuthService;

  static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  async initializeAuth(): Promise<boolean> {
    try {
      const token = this.getAccessToken();
      const refreshToken = this.getRefreshToken();

      if (!token) {
        return false;
      }

      adminApiClient.setToken(token);

      if (refreshToken) {
        adminApiClient.setRefreshToken(refreshToken);
      }

      // Test the token by making a request
      try {
        await adminApiClient.getMitras();
        return true;
      } catch {
        // Token might be expired, try to refresh
        if (refreshToken) {
          try {
            await adminApiClient.refreshAccessToken();
            return true;
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            this.clearTokens();
            return false;
          }
        }

        this.clearTokens();
        return false;
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
      return false;
    }
  }

  async handleCallback(code: string, state: string): Promise<void> {
    try {
      const response = await fetch("/api/auth/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        throw new Error("Authentication failed");
      }

      const { accessToken, refreshToken } = await response.json();

      this.setTokens(accessToken, refreshToken);
      adminApiClient.setTokens(accessToken, refreshToken);

      goto("/dashboard");
    } catch (error) {
      console.error("Callback handling failed:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      this.clearTokens();
      adminApiClient.clearToken();
      goto("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem("admin_access_token");
  }

  getRefreshToken(): string | null {
    return localStorage.getItem("admin_refresh_token");
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem("admin_access_token", accessToken);
    localStorage.setItem("admin_refresh_token", refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem("admin_access_token");
    localStorage.removeItem("admin_refresh_token");
  }
}

export const adminAuthService = AdminAuthService.getInstance();
