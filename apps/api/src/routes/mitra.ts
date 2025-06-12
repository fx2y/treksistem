import type { createAuthServices } from "@treksistem/auth";
import { Hono } from "hono";

const mitra = new Hono<{
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

// Middleware to require auth and Mitra role
mitra.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAuth(c, next);
});
mitra.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireMitraRole(c, next);
});

mitra.get("/services", async c => {
  // Return empty array for now - endpoint exists but empty
  return c.json([]);
});

export default mitra;
