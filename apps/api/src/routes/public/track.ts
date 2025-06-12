import * as schema from "@treksistem/db";
import { NotificationService } from "@treksistem/notifications";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

import { PublicOrderService } from "../../services/public-order.service";

const track = new Hono<{
  Bindings: {
    DB: D1Database;
  };
}>();

track.get("/:publicId", async c => {
  const db = drizzle(c.env.DB, { schema });
  const notificationService = new NotificationService(db);
  const publicOrderService = new PublicOrderService(db, notificationService);

  const publicId = c.req.param("publicId");

  if (!publicId) {
    return c.json({ error: "Public ID is required" }, 400);
  }

  try {
    const trackingResponse = await publicOrderService.getOrderStatus(publicId);
    return c.json(trackingResponse);
  } catch (error) {
    if (error instanceof Error && error.message === "Order not found") {
      return c.json({ error: "Order not found" }, 404);
    }
    return c.json({ error: "Failed to get order status" }, 500);
  }
});

export default track;
