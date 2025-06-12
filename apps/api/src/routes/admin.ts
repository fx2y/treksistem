import type { createAuthServices } from "@treksistem/auth";
import { Hono } from "hono";

const admin = new Hono<{
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

// Middleware to require auth and Admin role
admin.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAuth(c, next);
});
admin.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAdminRole(c, next);
});

admin.get("/mitras", async c => {
  // Return empty array for now - endpoint exists but empty
  return c.json([]);
});

export default admin;
