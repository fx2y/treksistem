import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

export interface R2Env {
  R2_BUCKET: R2Bucket;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
}

export interface R2UploadService {
  generateUploadUrl(options: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<{ signedUrl: string; publicUrl: string }>;
}

export const RequestUploadUrlBodySchema = z.object({
  fileName: z.string().min(1, "File name cannot be empty."),
  contentType: z.enum(["image/jpeg", "image/png"], {
    errorMap: () => ({
      message: "Only image/jpeg and image/png are supported.",
    }),
  }),
  orderId: z.string().min(1, "Order ID is required."),
});

export type RequestUploadUrlBody = z.infer<typeof RequestUploadUrlBodySchema>;

export function createR2UploadService(env: R2Env): R2UploadService {
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return {
    async generateUploadUrl({ key, contentType, expiresInSeconds = 300 }) {
      const command = new PutObjectCommand({
        Bucket: (env.R2_BUCKET as any).bucketName || "default-bucket",
        Key: key,
        ContentType: contentType,
      });

      const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: expiresInSeconds,
      });
      const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

      return { signedUrl, publicUrl };
    },
  };
}
