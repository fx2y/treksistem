import type { createAuthServices } from "@treksistem/auth";
import { Hono } from "hono";

import { rateLimit } from "../middleware/rate-limiter";
import type { ServiceContainer } from "../services/factory";

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
    services: ServiceContainer;
    userId: string;
  };
}>();

// Middleware for authenticated invites endpoints
pub.use("/invites/*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAuth(c, next);
});

// Mount invites routes
pub.route("/invites", invites);

// Rate limiting for public endpoints - 20 requests per 60 seconds
const publicRateLimit = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  max: 20, // 20 requests per window
});

pub.use("/services", publicRateLimit);
pub.use("/quote", publicRateLimit);
pub.use("/orders", publicRateLimit);
pub.use("/track/*", publicRateLimit);

// Mount public order routes - no authentication required
pub.route("/services", services);
pub.route("/quote", quote);
pub.route("/orders", orders);
pub.route("/track", track);

export default pub;
