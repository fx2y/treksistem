import type { createAuthServices } from "@treksistem/auth";
import * as schema from "@treksistem/db";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

import invites from "./public/invites";
import orders from "./public/orders";
import quote from "./public/quote";
import services from "./public/services";
import track from "./public/track";

const pub = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
    userId: string;
    db: ReturnType<typeof drizzle>;
  };
}>();

// Database middleware for invites endpoints
pub.use("/invites/*", async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  c.set("db", db);
  await next();
});

// Middleware for authenticated invites endpoints
pub.use("/invites/*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAuth(c, next);
});

// Mount invites routes
pub.route("/invites", invites);

// Mount public order routes - no authentication required
pub.route("/services", services);
pub.route("/quote", quote);
pub.route("/orders", orders);
pub.route("/track", track);

export default pub;
