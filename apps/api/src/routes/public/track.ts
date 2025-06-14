import { Hono } from "hono";

import type { ServiceContainer } from "../../services/factory";

const track = new Hono<{
  Bindings: {
    DB: D1Database;
  };
  Variables: {
    services: ServiceContainer;
  };
}>();

track.get("/:publicId", async c => {
  const { publicOrderService } = c.get("services");
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
