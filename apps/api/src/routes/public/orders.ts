import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import { Hono } from "hono";
import { z } from "zod";

import type { ServiceContainer } from "../../services/factory";

const orders = new Hono<{
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

const StopInputSchema = z.object({
  address: z.string().min(1).max(500).trim(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(["pickup", "dropoff"]),
});

const OrderCreationRequestSchema = z.object({
  serviceId: z.string().min(1).max(50).trim(),
  stops: z.array(StopInputSchema).min(2).max(10),
  ordererName: z.string().min(1).max(100).trim(),
  ordererPhone: z
    .string()
    .min(8)
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone format")
    .trim(),
  recipientName: z.string().min(1).max(100).trim(),
  recipientPhone: z
    .string()
    .min(8)
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Invalid phone format")
    .trim(),
  notes: z.string().max(1000).trim().optional(),
});

orders.post("/", zValidator("json", OrderCreationRequestSchema), async c => {
  const { publicOrderService } = c.get("services");
  const request = c.req.valid("json");

  const orderResponse = await publicOrderService.createOrder(request);
  return c.json(orderResponse, 201);
});

export default orders;
