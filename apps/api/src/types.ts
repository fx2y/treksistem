export interface Bindings {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  FRONTEND_URL: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
  UPLOAD_URL_EXPIRES_IN_SECONDS: string;
  MIDTRANS_SERVER_KEY: string;
  MIDTRANS_CLIENT_KEY: string;
  MIDTRANS_IS_PRODUCTION: string;
  OSRM_BASE_URL: string;
  RATE_LIMIT_KV?: KVNamespace; // Optional Redis-like KV store for rate limiting
  ALERTING_KV?: KVNamespace; // Optional KV store for alerting and monitoring state
}
