import { createRequireAuth, requireDriverRole } from "@treksistem/auth";
import { Hono } from "hono";

const driver = new Hono<{
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
}>();

// Middleware to require auth and Driver role
driver.use("*", (c, next) => createRequireAuth(c.env.JWT_SECRET)(c, next));
driver.use("*", requireDriverRole);

driver.get("/orders", async c => {
  // Return empty array for now - endpoint exists but empty
  return c.json([]);
});

export default driver;
