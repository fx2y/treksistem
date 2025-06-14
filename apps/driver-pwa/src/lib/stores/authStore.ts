import { writable } from "svelte/store";

import type { User } from "../services/apiClient";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  selectedMitraId: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  selectedMitraId: null,
};

export const authStore = writable<AuthState>(initialState);

export const authActions = {
  login: (user: User) => {
    authStore.update(state => ({
      ...state,
      user,
      isAuthenticated: true,
      selectedMitraId: user.driverForMitras?.[0]?.id || null,
    }));
  },

  logout: () => {
    authStore.set(initialState);
  },

  selectMitra: (mitraId: string) => {
    authStore.update(state => ({
      ...state,
      selectedMitraId: mitraId,
    }));
  },
};
