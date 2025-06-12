import { Hono } from "hono";

const pub = new Hono();

// Public endpoint - no authentication required
pub.get("/services", async c => {
  // Return empty array for now - endpoint exists but empty
  return c.json([]);
});

export default pub;
