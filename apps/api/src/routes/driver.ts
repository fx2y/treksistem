import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import { createDbClient, driverLocations } from "@treksistem/db";
import { Hono } from "hono";
import { z } from "zod";

import orders from "./driver/orders";
import status from "./driver/status";

// Validation schema for driver location payload
const DriverLocationPayload = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const driver = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
  };
}>();

// Middleware to require auth and Driver role
driver.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAuth(c, next);
});
driver.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireDriverRole(c, next);
});

// Mount sub-routes
driver.route("/orders", orders);
driver.route("/status", status);

driver.post("/location", zValidator("json", DriverLocationPayload), async c => {
  const { lat, lng } = c.req.valid("json");
  const driverId = c.get("driverId");

  const db = createDbClient(c.env.DB);

  await db
    .insert(driverLocations)
    .values({
      driverId,
      lat,
      lng,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: driverLocations.driverId,
      set: {
        lat,
        lng,
        lastSeenAt: new Date(),
      },
    });

  return c.body(null, 204);
});

export default driver;
