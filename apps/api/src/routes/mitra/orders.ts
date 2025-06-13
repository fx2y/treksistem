import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import { NotificationService } from "@treksistem/notifications";
import type { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { z } from "zod";

import { MitraMonitoringService } from "../../services/mitra-monitoring.service";
import { MitraOrderService } from "../../services/mitra-order.service";

const StopInputSchema = z.object({
  address: z.string().min(1, "Address is required"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(["pickup", "dropoff"]),
});

const CreateManualOrderSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  stops: z.array(StopInputSchema).min(2, "At least 2 stops are required"),
  ordererName: z.string().min(1, "Orderer name is required"),
  ordererPhone: z.string().min(1, "Orderer phone is required"),
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientPhone: z.string().min(1, "Recipient phone is required"),
  notes: z.string().optional(),
  assignToDriverId: z.string().optional(),
  assignToVehicleId: z.string().optional(),
  sendNotifications: z.boolean().default(true),
});

const AssignOrderSchema = z.object({
  driverId: z.string().min(1, "Driver ID is required"),
  vehicleId: z.string().optional(),
});

const GetMitraOrdersQuerySchema = z.object({
  status: z
    .enum([
      "pending_dispatch",
      "accepted",
      "pickup",
      "in_transit",
      "delivered",
      "cancelled",
      "claimed",
    ])
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
});

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
    db: ReturnType<typeof drizzle>;
    mitraId: string;
    userId: string;
  };
}>();

// GET /api/mitra/orders - Get paginated and filtered orders for dashboard
orders.get("/", zValidator("query", GetMitraOrdersQuerySchema), async c => {
  try {
    const db = c.get("db");
    const mitraId = c.get("mitraId");
    const query = c.req.valid("query");

    const monitoringService = new MitraMonitoringService(db);
    const result = await monitoringService.getOrders(mitraId, query);

    return c.json(result, 200);
  } catch (error) {
    console.error("Failed to get mitra orders:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /api/mitra/orders - Create manual order
orders.post("/", zValidator("json", CreateManualOrderSchema), async c => {
  try {
    const db = c.get("db");
    const mitraId = c.get("mitraId");
    const userId = c.get("userId");
    const input = c.req.valid("json");

    const notificationService = new NotificationService(db);
    const mitraOrderService = new MitraOrderService(db, notificationService);

    const result = await mitraOrderService.createManualOrder(
      mitraId,
      userId,
      input
    );

    return c.json(result, 201);
  } catch (error) {
    console.error("Failed to create manual order:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("not owned")
      ) {
        return c.json({ error: error.message }, 404);
      }
      if (
        error.message.includes("Invalid") ||
        error.message.includes("required")
      ) {
        return c.json({ error: error.message }, 400);
      }
    }

    return c.json({ error: "Internal server error" }, 500);
  }
});

// POST /api/mitra/orders/:orderId/assign - Assign order to driver
orders.post(
  "/:orderId/assign",
  zValidator("json", AssignOrderSchema),
  async c => {
    try {
      const db = c.get("db");
      const mitraId = c.get("mitraId");
      const userId = c.get("userId");
      const orderId = c.req.param("orderId");
      const input = c.req.valid("json");

      if (!orderId) {
        return c.json({ error: "Order ID is required" }, 400);
      }

      const notificationService = new NotificationService(db);
      const mitraOrderService = new MitraOrderService(db, notificationService);

      const result = await mitraOrderService.assignOrder(
        mitraId,
        userId,
        orderId,
        input
      );

      return c.json(result, 200);
    } catch (error) {
      console.error("Failed to assign order:", error);

      if (error instanceof Error) {
        if (
          error.message.includes("not found") ||
          error.message.includes("not owned")
        ) {
          return c.json({ error: error.message }, 404);
        }
        if (error.message.includes("not in pending_dispatch")) {
          return c.json({ error: error.message }, 400);
        }
        if (
          error.message.includes("Invalid") ||
          error.message.includes("required")
        ) {
          return c.json({ error: error.message }, 400);
        }
      }

      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

export default orders;
