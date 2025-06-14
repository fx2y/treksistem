import { createAuthServices, type AuthEnvironment } from "@treksistem/auth";
import { Hono } from "hono";

import { rateLimitByIP } from "../middleware/rate-limit.middleware";
import type { ServiceContainer } from "../services/factory";

const auth = new Hono<{
  Bindings: AuthEnvironment;
  Variables: {
    services: ServiceContainer;
  };
}>();

// Apply rate limiting to auth endpoints
auth.use("*", async (c, next) => {
  const { rateLimitService } = c.get("services");
  return rateLimitByIP(rateLimitService, "auth:general")(c, next);
});

auth.get("/login/google", async c => {
  const { authService, rateLimitService } = c.get("services");
  
  // Apply specific rate limit for login attempts
  const ip = c.req.header("cf-connecting-ip") || 
             c.req.header("x-forwarded-for") || 
             c.req.header("x-real-ip") || 
             "unknown";
  await rateLimitService.enforceRateLimit("auth:login", ip, "ip");
  
  const loginData = await authService.initiateGoogleLogin();
  return c.json(loginData);
});

auth.get("/callback/google", async c => {
  const { authService } = c.get("services");
  const code = c.req.query("code");
  const state = c.req.query("state");
  
  if (!code || !state) {
    return c.json({ error: "Missing required parameters" }, 400);
  }
  
  const tokens = await authService.handleGoogleCallback(code, state);
  return c.json(tokens);
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
  const { authService } = c.get("services");
  const refreshToken = c.req.header("x-refresh-token");
  const result = await authService.logout(refreshToken || undefined);
  return c.json(result);
});

auth.post("/refresh", async c => {
  const { authService, rateLimitService } = c.get("services");
  const refreshToken = c.req.header("x-refresh-token");
  
  if (!refreshToken) {
    return c.json({ error: "Refresh token required" }, 400);
  }
  
  // Apply specific rate limit for refresh attempts
  const ip = c.req.header("cf-connecting-ip") || 
             c.req.header("x-forwarded-for") || 
             c.req.header("x-real-ip") || 
             "unknown";
  await rateLimitService.enforceRateLimit("auth:refresh", ip, "ip");
  
  const tokens = await authService.refreshAccessToken(refreshToken);
  return c.json(tokens);
});

export default auth;
