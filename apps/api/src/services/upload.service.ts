import type { DbClient } from "@treksistem/db";
import {
  createR2UploadService,
  type RequestUploadUrlBody,
} from "@treksistem/storage";
import { nanoid } from "nanoid";

import { ForbiddenError } from "../lib/errors";

export interface UploadUrlRequest {
  fileName: string;
  contentType: string;
  orderId: string;
}

export interface UploadUrlResponse {
  signedUrl: string;
  publicUrl: string;
}

export interface UploadEnvironment {
  R2_BUCKET?: R2Bucket;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_PUBLIC_URL?: string;
  UPLOAD_URL_EXPIRES_IN_SECONDS?: string;
}

export interface UserProfile {
  roles: {
    isDriver: boolean;
    driverForMitras?: Array<{ mitraId: string }>;
  };
}

export class UploadService {
  constructor(
    private db: DbClient,
    private env: UploadEnvironment
  ) {}

  async generateDriverUploadUrl(
    request: UploadUrlRequest,
    userProfile: UserProfile
  ): Promise<UploadUrlResponse> {
    if (
      !userProfile?.roles.isDriver ||
      !userProfile.roles.driverForMitras?.length
    ) {
      throw new ForbiddenError("Driver is not associated with a Mitra.");
    }

    const mitraId = userProfile.roles.driverForMitras[0].mitraId;

    if (!this.env.R2_BUCKET || !this.env.R2_ACCOUNT_ID || !this.env.R2_ACCESS_KEY_ID || 
        !this.env.R2_SECRET_ACCESS_KEY || !this.env.R2_PUBLIC_URL) {
      throw new Error("R2 configuration is incomplete");
    }

    const r2Service = createR2UploadService({
      R2_BUCKET: this.env.R2_BUCKET,
      R2_ACCOUNT_ID: this.env.R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID: this.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: this.env.R2_SECRET_ACCESS_KEY,
      R2_PUBLIC_URL: this.env.R2_PUBLIC_URL,
    });

    const key = `reports/${mitraId}/${request.orderId}/${nanoid()}-${request.fileName}`;

    const expiresInSeconds =
      parseInt(this.env.UPLOAD_URL_EXPIRES_IN_SECONDS || "300", 10);

    const { signedUrl, publicUrl } = await r2Service.generateUploadUrl({
      key,
      contentType: request.contentType,
      expiresInSeconds,
    });

    return { signedUrl, publicUrl };
  }
}