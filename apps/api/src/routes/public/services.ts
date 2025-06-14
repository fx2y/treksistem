import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import { Hono } from "hono";
import { z } from "zod";

import type { ServiceContainer } from "../../services/factory";

const services = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
    services: ServiceContainer;
    userId: string;
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
  const { publicOrderService } = c.get("services");
  const params = c.req.valid("query");

  const availableServices = await publicOrderService.findAvailableServices(params);
  return c.json(availableServices);
});

export default services;
