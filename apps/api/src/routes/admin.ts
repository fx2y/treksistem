import { createRequireAuth, requireAdminRole } from "@treksistem/auth";
import { Hono } from "hono";

const admin = new Hono<{
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
}>();

// Middleware to require auth and Admin role
admin.use("*", (c, next) => createRequireAuth(c.env.JWT_SECRET)(c, next));
admin.use("*", requireAdminRole);

admin.get("/mitras", async c => {
  // Return empty array for now - endpoint exists but empty
  return c.json([]);
});

export default admin;
