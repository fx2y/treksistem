import { z } from "zod";

export const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type Coordinate = z.infer<typeof CoordinateSchema>;

export const OsrmRouteResponseSchema = z.object({
  code: z.literal("Ok"),
  routes: z
    .array(
      z.object({
        distance: z.number().positive(),
      })
    )
    .min(1),
});

export type OsrmRouteResponse = z.infer<typeof OsrmRouteResponseSchema>;

export type DistanceResult = {
  distanceKm: number;
};
