import type { createAuthServices } from "@treksistem/auth";
import { Hono } from "hono";

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

driver.get("/orders", async c => {
  // Return empty array for now - endpoint exists but empty
  return c.json([]);
});

export default driver;
