import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import { RequestUploadUrlBodySchema } from "@treksistem/storage";
import { Hono } from "hono";

import type { ServiceContainer } from "../services/factory";

const uploads = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
    R2_BUCKET: R2Bucket;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_PUBLIC_URL: string;
    UPLOAD_URL_EXPIRES_IN_SECONDS: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
    services: ServiceContainer;
  };
}>();

// Middleware to require auth and Driver role
uploads.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAuth(c, next);
});
uploads.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireDriverRole(c, next);
});

uploads.post(
  "/request-url",
  zValidator("json", RequestUploadUrlBodySchema),
  async c => {
    const request = c.req.valid("json");
    const { authMiddleware } = c.get("authServices");
    const { uploadService } = c.get("services");
    
    const userProfile = await authMiddleware.getUserProfile(c);
    if (!userProfile) {
      return c.json({ error: "User profile not found" }, 401);
    }
    const result = await uploadService.generateDriverUploadUrl(request, userProfile);
    
    return c.json(result);
  }
);

export default uploads;
