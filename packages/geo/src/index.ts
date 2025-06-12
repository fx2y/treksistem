import {
  OsrmRouteResponseSchema,
  type Coordinate,
  type DistanceResult,
} from "./types";

const OSRM_BASE_URL = "http://router.project-osrm.org";

export async function getDistance(
  origin: Coordinate,
  destination: Coordinate
): Promise<DistanceResult> {
  // Validate coordinates
  if (
    origin.lat < -90 ||
    origin.lat > 90 ||
    destination.lat < -90 ||
    destination.lat > 90
  ) {
    throw new Error(
      "Invalid coordinates provided: latitude must be between -90 and 90"
    );
  }
  if (
    origin.lng < -180 ||
    origin.lng > 180 ||
    destination.lng < -180 ||
    destination.lng > 180
  ) {
    throw new Error(
      "Invalid coordinates provided: longitude must be between -180 and 180"
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `${OSRM_BASE_URL}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;

    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error(
          "Could not find a route between the provided coordinates"
        );
      }
      throw new Error(`OSRM API request failed with status ${response.status}`);
    }

    const data = await response.json();

    const parseResult = OsrmRouteResponseSchema.safeParse(data);
    if (!parseResult.success) {
      throw new Error(
        "Could not find a route between the provided coordinates"
      );
    }

    const validatedData = parseResult.data;
    if (validatedData.routes.length === 0) {
      throw new Error(
        "Could not find a route between the provided coordinates"
      );
    }

    const distanceMeters = validatedData.routes[0].distance;
    const distanceKm = distanceMeters / 1000;

    return { distanceKm };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OSRM API request timed out after 5 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export * from "./types";
