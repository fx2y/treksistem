import { describe, it, expect, vi } from "vitest";

import { getDistance } from "./index.js";

global.fetch = vi.fn();

describe("getDistance", () => {
  it("should throw error for invalid origin coordinates", async () => {
    const invalidOrigin = { lat: 91, lng: 0 };
    const validDestination = { lat: -7.979, lng: 112.6346 };

    await expect(getDistance(invalidOrigin, validDestination)).rejects.toThrow(
      "Invalid origin coordinates: latitude must be between -90 and 90, longitude must be between -180 and 180"
    );
  });

  it("should throw error for invalid destination coordinates", async () => {
    const validOrigin = { lat: -7.9797, lng: 112.6304 };
    const invalidDestination = { lat: 0, lng: 181 };

    await expect(getDistance(validOrigin, invalidDestination)).rejects.toThrow(
      "Invalid destination coordinates: latitude must be between -90 and 90, longitude must be between -180 and 180"
    );
  });

  it("should handle 400 status code as no route found", async () => {
    const origin = { lat: -7.9797, lng: 112.6304 };
    const destination = { lat: -7.979, lng: 112.6346 };

    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    await expect(getDistance(origin, destination)).rejects.toThrow(
      "Could not find a route between the provided coordinates"
    );
  });

  it("should calculate the road distance between two points in Malang", async () => {
    const stasiunMalang = { lat: -7.9797, lng: 112.6304 };
    const alunAlunTugu = { lat: -7.979, lng: 112.6346 };

    const mockResponse = {
      code: "Ok",
      routes: [
        {
          distance: 1200,
          duration: 180,
          legs: [],
        },
      ],
      waypoints: [],
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getDistance(stasiunMalang, alunAlunTugu);

    expect(result.distanceKm).toBe(1.2);
    expect(fetch).toHaveBeenCalledWith(
      "http://router.project-osrm.org/route/v1/driving/112.6304,-7.9797;112.6346,-7.979?overview=false",
      { signal: expect.any(AbortSignal) }
    );
  });

  it("should throw error when OSRM API returns non-Ok code", async () => {
    const origin = { lat: -7.9797, lng: 112.6304 };
    const destination = { lat: -7.979, lng: 112.6346 };

    const mockResponse = {
      code: "NoRoute",
      message: "No route found",
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await expect(getDistance(origin, destination)).rejects.toThrow(
      "Could not find a route between the provided coordinates"
    );
  });

  it("should throw error when HTTP request fails", async () => {
    const origin = { lat: -7.9797, lng: 112.6304 };
    const destination = { lat: -7.979, lng: 112.6346 };

    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(getDistance(origin, destination)).rejects.toThrow(
      "OSRM API request failed with status 500"
    );
  });

  it("should throw timeout error when request takes too long", async () => {
    const origin = { lat: -7.9797, lng: 112.6304 };
    const destination = { lat: -7.979, lng: 112.6346 };

    (fetch as any).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          setTimeout(
            () => reject(new DOMException("AbortError", "AbortError")),
            5100
          );
        })
    );

    await expect(getDistance(origin, destination)).rejects.toThrow(
      "OSRM API request timed out after 5 seconds"
    );
  }, 10000);

  it("should throw error when no routes are found", async () => {
    const origin = { lat: -7.9797, lng: 112.6304 };
    const destination = { lat: -7.979, lng: 112.6346 };

    const mockResponse = {
      code: "Ok",
      routes: [],
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await expect(getDistance(origin, destination)).rejects.toThrow(
      "Could not find a route between the provided coordinates"
    );
  });
});
