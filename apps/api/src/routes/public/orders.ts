import { zValidator } from "@hono/zod-validator";
import * as schema from "@treksistem/db";
import { NotificationService } from "@treksistem/notifications";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { z } from "zod";

import { PublicOrderService } from "../../services/public-order.service";

const orders = new Hono<{
  Bindings: {
    DB: D1Database;
  };
}>();

const StopInputSchema = z.object({
  address: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(["pickup", "dropoff"]),
});

const OrderCreationRequestSchema = z.object({
  serviceId: z.string().min(1),
  stops: z.array(StopInputSchema).min(2),
  ordererName: z.string().min(1),
  ordererPhone: z.string().min(1),
  recipientName: z.string().min(1),
  recipientPhone: z.string().min(1),
  notes: z.string().optional(),
});

orders.post("/", zValidator("json", OrderCreationRequestSchema), async c => {
  const db = drizzle(c.env.DB, { schema });
  const notificationService = new NotificationService(db);
  const publicOrderService = new PublicOrderService(db, notificationService);

  const request = c.req.valid("json");

  try {
    const orderResponse = await publicOrderService.createOrder(request);
    return c.json(orderResponse, 201);
  } catch (error) {
    console.error("Order creation error:", error);
    if (
      error instanceof Error &&
      error.message === "Service not found or not public"
    ) {
      return c.json({ error: "Service not found" }, 404);
    }
    return c.json(
      {
        error: "Failed to create order",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default orders;
