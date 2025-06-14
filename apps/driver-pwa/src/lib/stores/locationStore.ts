import { writable } from "svelte/store";

import { apiClient } from "../services/apiClient";

interface LocationState {
  isActive: boolean;
  currentLocation: { lat: number; lng: number } | null;
  lastUpdate: Date | null;
  error: string | null;
}

const initialState: LocationState = {
  isActive: false,
  currentLocation: null,
  lastUpdate: null,
  error: null,
};

export const locationStore = writable<LocationState>(initialState);

let locationInterval: NodeJS.Timeout | null = null;

export const locationActions = {
  startTracking: () => {
    locationStore.update(state => ({ ...state, isActive: true, error: null }));

    // Update location immediately
    updateLocation();

    // Set up periodic updates (every 2 minutes)
    locationInterval = setInterval(updateLocation, 2 * 60 * 1000);
  },

  stopTracking: () => {
    locationStore.update(state => ({ ...state, isActive: false }));

    if (locationInterval) {
      clearInterval(locationInterval);
      locationInterval = null;
    }
  },

  updateLocation: updateLocation,
};

async function updateLocation() {
  try {
    if (!navigator.geolocation) {
      throw new Error("Geolocation is not supported by this browser");
    }

    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      }
    );

    const location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    // Send location to API
    await apiClient.updateLocation(location);

    locationStore.update(state => ({
      ...state,
      currentLocation: location,
      lastUpdate: new Date(),
      error: null,
    }));
  } catch (error) {
    console.error("Location update failed:", error);
    locationStore.update(state => ({
      ...state,
      error:
        error instanceof Error ? error.message : "Failed to update location",
    }));
  }
}
