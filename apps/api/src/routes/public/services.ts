import { zValidator } from "@hono/zod-validator";
import * as schema from "@treksistem/db";
import { NotificationService } from "@treksistem/notifications";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { z } from "zod";

import { PublicOrderService } from "../../services/public-order.service";

const services = new Hono<{
  Bindings: {
    DB: D1Database;
  };
}>();

const ServiceDiscoverySchema = z.object({
  lat: z
    .string()
    .transform(val => parseFloat(val))
    .pipe(z.number().min(-90).max(90)),
  lng: z
    .string()
    .transform(val => parseFloat(val))
    .pipe(z.number().min(-180).max(180)),
  payloadTypeId: z.string().min(1),
});

services.get("/", zValidator("query", ServiceDiscoverySchema), async c => {
  const db = drizzle(c.env.DB, { schema });
  const notificationService = new NotificationService(db);
  const publicOrderService = new PublicOrderService(db, notificationService);

  const params = c.req.valid("query");

  try {
    const availableServices =
      await publicOrderService.findAvailableServices(params);
    return c.json(availableServices);
  } catch (error) {
    return c.json({ error: "Failed to fetch services" }, 500);
  }
});

export default services;
