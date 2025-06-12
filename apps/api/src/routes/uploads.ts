import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import {
  RequestUploadUrlBodySchema,
  createR2UploadService,
} from "@treksistem/storage";
import { Hono } from "hono";
import { nanoid } from "nanoid";

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
    const { fileName, contentType, orderId } = c.req.valid("json");
    const { authMiddleware } = c.get("authServices");
    const userProfile = await authMiddleware.getUserProfile(c);

    if (
      !userProfile?.roles.isDriver ||
      !userProfile.roles.driverForMitras?.length
    ) {
      return c.json({ error: "Driver is not associated with a Mitra." }, 403);
    }

    // Use the first mitra the driver is associated with
    const mitraId = userProfile.roles.driverForMitras[0].mitraId;

    const r2Service = createR2UploadService({
      R2_BUCKET: c.env.R2_BUCKET,
      R2_ACCOUNT_ID: c.env.R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID: c.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: c.env.R2_SECRET_ACCESS_KEY,
      R2_PUBLIC_URL: c.env.R2_PUBLIC_URL,
    });

    const key = `reports/${mitraId}/${orderId}/${nanoid()}-${fileName}`;

    const expiresInSeconds =
      parseInt(c.env.UPLOAD_URL_EXPIRES_IN_SECONDS, 10) || 300;

    try {
      const { signedUrl, publicUrl } = await r2Service.generateUploadUrl({
        key,
        contentType,
        expiresInSeconds,
      });

      return c.json({ signedUrl, publicUrl });
    } catch (error) {
      console.error("Failed to generate signed URL:", error);
      return c.json({ error: "Could not prepare upload." }, 500);
    }
  }
);

export default uploads;
