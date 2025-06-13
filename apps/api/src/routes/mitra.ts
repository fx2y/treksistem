import type { createAuthServices } from "@treksistem/auth";
import * as schema from "@treksistem/db";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

import billing from "./mitra/billing";
import drivers from "./mitra/drivers";
import invites from "./mitra/invites";
import masterData from "./mitra/master-data";
import orders from "./mitra/orders";
import services from "./mitra/services";
import vehicles from "./mitra/vehicles";

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
    db: ReturnType<typeof drizzle>;
    mitraId: string;
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

// Database middleware
mitra.use("*", async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  c.set("db", db);
  await next();
});

// Mount service routes
mitra.route("/billing", billing);
mitra.route("/drivers", drivers);
mitra.route("/invites", invites);
mitra.route("/orders", orders);
mitra.route("/services", services);
mitra.route("/vehicles", vehicles);
mitra.route("/master-data", masterData);

export default mitra;
