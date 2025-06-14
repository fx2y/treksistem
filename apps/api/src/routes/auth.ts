import { createAuthServices, type AuthEnvironment } from "@treksistem/auth";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import { rateLimit } from "../middleware/rate-limiter";
import type { ServiceContainer } from "../services/factory";

const auth = new Hono<{
  Bindings: AuthEnvironment;
  Variables: {
    services: ServiceContainer;
  };
}>();

// Rate limiting for auth endpoints - 10 requests per 60 seconds
const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  max: 10, // 10 requests per window
});

// Apply rate limiting to all auth endpoints
auth.use("*", authRateLimit);

auth.get("/login/google", async c => {
  // TODO: Move this logic to a dedicated AuthService
  return c.text("Google OAuth login - needs reimplementation");
});

auth.get("/callback/google", async c => {
  // TODO: Move this logic to a dedicated AuthService
  return c.text("Google OAuth callback - needs reimplementation");
});

auth.use("/me", async (c, next) => {
  const { authMiddleware } = createAuthServices(c.env);
  return authMiddleware.requireAuth(c, next);
});

auth.get("/me", async c => {
  const { authMiddleware } = createAuthServices(c.env);
  const profile = await authMiddleware.getUserProfile(c);
  return c.json(profile);
});

auth.post("/logout", async c => {
  // TODO: Move this logic to a dedicated AuthService
  return c.json({ success: true });
});

auth.post("/refresh", async c => {
  // TODO: Move this logic to a dedicated AuthService
  return c.json({ status: "ok" });
});

export default auth;
