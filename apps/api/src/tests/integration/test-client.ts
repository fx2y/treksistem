import { testClient } from "hono/testing";

import { app } from "../../index";
import type { Bindings } from "../../types";

import { testDb } from "./setup";

// Mock R2Bucket for testing
const mockR2Bucket: R2Bucket = {
  get: async () => null,
  put: async () => ({ key: "test-key" }) as any,
  delete: async () => undefined,
  list: async () => ({ objects: [] }) as any,
  head: async () => null,
} as R2Bucket;

// Mock Cloudflare Bindings for testing
export function createMockEnv(): Bindings {
  return {
    DB: testDb as unknown as D1Database,
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/auth/callback/google",
    FRONTEND_URL: "http://localhost:3000",
    R2_ACCOUNT_ID: "test-account-id",
    R2_ACCESS_KEY_ID: "test-access-key",
    R2_SECRET_ACCESS_KEY: "test-secret-key",
    R2_BUCKET: mockR2Bucket,
    R2_PUBLIC_URL: "https://test-bucket.r2.dev",
    UPLOAD_URL_EXPIRES_IN_SECONDS: "3600",
    MIDTRANS_SERVER_KEY: "test-midtrans-key",
    MIDTRANS_CLIENT_KEY: "test-midtrans-client-key",
    MIDTRANS_IS_PRODUCTION: "false",
    OSRM_BASE_URL: "http://localhost:5000",
  };
}

// Create a properly configured test client
export function createTestClient() {
  const mockEnv = createMockEnv();

  // Create test client with mock environment
  const client = testClient(app, mockEnv);

  return client;
}

// Helper to create authenticated requests
export function createAuthenticatedClient(token: string) {
  const client = createTestClient();

  // Return a wrapper that adds the Authorization header to all requests
  return {
    ...client,
    api: new Proxy(client.api, {
      get(target, prop) {
        const value = target[prop as keyof typeof target];
        if (typeof value === "object" && value !== null) {
          return new Proxy(value, {
            get(nestedTarget, nestedProp) {
              const nestedValue =
                nestedTarget[nestedProp as keyof typeof nestedTarget];
              if (typeof nestedValue === "function") {
                return function (...args: any[]) {
                  // Add Authorization header to the request
                  const headers = { Authorization: `Bearer ${token}` };
                  if (args[0] && typeof args[0] === "object") {
                    args[0] = {
                      ...args[0],
                      header: { ...args[0].header, ...headers },
                    };
                  } else {
                    args[0] = { header: headers };
                  }
                  return nestedValue.apply(nestedTarget, args);
                };
              }
              return nestedValue;
            },
          });
        }
        return value;
      },
    }),
  };
}
