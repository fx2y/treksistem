import { writable } from "svelte/store";

import { apiClient } from "../services/apiClient";
import type { User } from "../services/apiClient";

import { browser } from "$app/environment";
import { goto } from "$app/navigation";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  selectedMitraId: string | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  selectedMitraId: null,
  loading: false,
};

export const authStore = writable<AuthState>(initialState);

export const authActions = {
  async initializeAuth(): Promise<void> {
    if (!browser) return;

    authStore.update(state => ({ ...state, loading: true }));

    const token = localStorage.getItem("auth_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (token) {
      apiClient.setToken(token);
      if (refreshToken) {
        apiClient.setRefreshToken(refreshToken);
      }

      try {
        const userData = await apiClient.getMe();
        authStore.update(state => ({
          ...state,
          user: userData,
          isAuthenticated: true,
          selectedMitraId: userData.driverForMitras?.[0]?.id || null,
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to restore authentication:", error);
        apiClient.logout();
        authStore.update(state => ({ ...state, loading: false }));
      }
    } else {
      authStore.update(state => ({ ...state, loading: false }));
    }
  },

  loginWithGoogle(): void {
    if (browser) {
      window.location.href = "/api/auth/login/google";
    }
  },

  async handleCallback(): Promise<void> {
    if (!browser) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const error = urlParams.get("error");

    if (error) {
      console.error("Authentication error:", error);
      await goto("/?error=" + encodeURIComponent(error));
      return;
    }

    if (code && state) {
      try {
        const tokenResponse = await fetch(
          `/api/auth/callback/google?code=${code}&state=${state}`
        );
        if (!tokenResponse.ok) {
          throw new Error("Token exchange failed");
        }

        const { accessToken, refreshToken } = await tokenResponse.json();
        apiClient.setTokens(accessToken, refreshToken);

        const userData = await apiClient.getMe();
        authStore.update(state => ({
          ...state,
          user: userData,
          isAuthenticated: true,
          selectedMitraId: userData.driverForMitras?.[0]?.id || null,
        }));
        await goto("/");
      } catch (err) {
        console.error("Failed to handle callback:", err);
        await goto("/?error=" + encodeURIComponent("Authentication failed"));
      }
    } else {
      await goto(
        "/?error=" + encodeURIComponent("Missing authentication parameters")
      );
    }
  },

  async logout(): Promise<void> {
    try {
      // The logout endpoint expects the refresh token in the header
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }

    apiClient.logout();
    authStore.set(initialState);
    if (browser) {
      await goto("/");
    }
  },

  selectMitra: (mitraId: string) => {
    authStore.update(state => ({
      ...state,
      selectedMitraId: mitraId,
    }));
  },
};
