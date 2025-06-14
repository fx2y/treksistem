export interface Bindings {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  R2_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
  UPLOAD_URL_EXPIRES_IN_SECONDS: string;
}