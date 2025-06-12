import { zValidator } from "@hono/zod-validator";
import type { AuthEnvironment } from "@treksistem/auth";
import {
  RequestUploadUrlBodySchema,
  createR2UploadService,
} from "@treksistem/storage";
import { Hono } from "hono";
import { nanoid } from "nanoid";

interface UploadsContext {
  Bindings: AuthEnvironment & {
    R2_BUCKET: R2Bucket;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_PUBLIC_URL: string;
    UPLOAD_URL_EXPIRES_IN_SECONDS: string;
  };
  Variables: {
    userProfile?: {
      user: { id: string; email: string; name?: string; avatarUrl?: string };
      roles: {
        isMitra: boolean;
        mitraId?: string;
        isDriver: boolean;
        driverForMitras?: string[];
        isAdmin: boolean;
      };
    };
    authMiddleware: {
      requireAuth: (c: any, next: any) => Promise<void>;
      requireMitraRole: (c: any, next: any) => Promise<void>;
      requireDriverRole: (c: any, next: any) => Promise<void>;
      requireAdminRole: (c: any, next: any) => Promise<void>;
    };
  };
}

const uploads = new Hono<UploadsContext>();

uploads.post(
  "/request-url",
  (c, next) => c.get("authMiddleware").requireDriverRole(c, next),
  zValidator("json", RequestUploadUrlBodySchema),
  async c => {
    const { fileName, contentType, orderId } = c.req.valid("json");
    const userProfile = c.get("userProfile");

    if (
      !userProfile?.roles.isDriver ||
      !userProfile.roles.driverForMitras?.length
    ) {
      return c.json({ error: "Driver is not associated with a Mitra." }, 403);
    }

    // Use the first mitra the driver is associated with
    const mitraId = userProfile.roles.driverForMitras[0];

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
