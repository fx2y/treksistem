import { z } from "zod";

export const OsrmRouteResponseSchema = z.object({
  code: z.literal("Ok"),
  routes: z
    .array(
      z.object({
        distance: z.number().min(0), // Distance in meters
      })
    )
    .min(1), // Must have at least one route
});

export type OsrmRouteResponse = z.infer<typeof OsrmRouteResponseSchema>;

export type Coordinate = {
  lat: number;
  lng: number;
};

export type DistanceResult = {
  distanceKm: number;
};
