import { createRequireAuth, requireMitraRole } from "@treksistem/auth";
import { Hono } from "hono";

const mitra = new Hono<{
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
}>();

// Middleware to require auth and Mitra role
mitra.use("*", (c, next) => createRequireAuth(c.env.JWT_SECRET)(c, next));
mitra.use("*", requireMitraRole);

mitra.get("/services", async c => {
  // Return empty array for now - endpoint exists but empty
  return c.json([]);
});

export default mitra;
