import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import { createDbClient } from "@treksistem/db";
import { Hono } from "hono";
import { z } from "zod";

import { DriverWorkflowService } from "../../services/driver-workflow.service";

const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    "accepted",
    "pickup",
    "in_transit",
    "delivered",
    "cancelled",
  ]),
});

const SubmitReportSchema = z.object({
  stage: z.enum(["pickup", "dropoff", "transit_update"]),
  notes: z.string().optional(),
  photoUrl: z.string().url().optional(),
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
    driverId: string;
  };
}>();

orders.get("/", async c => {
  const driverId = c.get("driverId");
  const db = createDbClient(c.env.DB);
  const service = new DriverWorkflowService(db);

  try {
    const assignedOrders = await service.getAssignedOrders(driverId);
    return c.json(assignedOrders);
  } catch (error) {
    return c.json({ error: "Failed to fetch assigned orders" }, 500);
  }
});

orders.post(
  "/:orderId/status",
  zValidator("json", UpdateOrderStatusSchema),
  async c => {
    const orderId = c.req.param("orderId");
    const driverId = c.get("driverId");
    const { status } = c.req.valid("json");

    const db = createDbClient(c.env.DB);
    const service = new DriverWorkflowService(db);

    try {
      await service.updateOrderStatus(driverId, orderId, status);
      return c.body(null, 204);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to update order status",
        },
        400
      );
    }
  }
);

orders.post("/:orderId/stops/:stopId/complete", async c => {
  const orderId = c.req.param("orderId");
  const stopId = c.req.param("stopId");
  const driverId = c.get("driverId");

  const db = createDbClient(c.env.DB);
  const service = new DriverWorkflowService(db);

  try {
    await service.completeOrderStop(driverId, orderId, stopId);
    return c.body(null, 204);
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete order stop",
      },
      400
    );
  }
});

orders.post(
  "/:orderId/report",
  zValidator("json", SubmitReportSchema),
  async c => {
    const orderId = c.req.param("orderId");
    const driverId = c.get("driverId");
    const reportData = c.req.valid("json");

    const db = createDbClient(c.env.DB);
    const service = new DriverWorkflowService(db);

    try {
      await service.submitReport(driverId, orderId, reportData);
      return c.body(null, 201);
    } catch (error) {
      return c.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to submit report",
        },
        400
      );
    }
  }
);

export default orders;
