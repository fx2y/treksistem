import { createAuthServices, type AuthEnvironment } from "@treksistem/auth";
import { Hono } from "hono";

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
  const { authService } = c.get("services");
  const loginData = await authService.initiateGoogleLogin();
  
  // Store state in session/cookie for validation
  // For now, return the redirect URL and state for client handling
  return c.json(loginData);
});

auth.get("/callback/google", async c => {
  const { authService } = c.get("services");
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = c.req.header("x-auth-state"); // Should come from session/cookie
  const codeVerifier = c.req.header("x-code-verifier"); // Should come from session/cookie
  
  if (!code || !state || !storedState || !codeVerifier) {
    return c.json({ error: "Missing required parameters" }, 400);
  }
  
  const tokens = await authService.handleGoogleCallback(code, state, storedState, codeVerifier);
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
  const { authService } = c.get("services");
  const refreshToken = c.req.header("x-refresh-token");
  
  if (!refreshToken) {
    return c.json({ error: "Refresh token required" }, 400);
  }
  
  const tokens = await authService.refreshAccessToken(refreshToken);
  return c.json(tokens);
});

export default auth;
