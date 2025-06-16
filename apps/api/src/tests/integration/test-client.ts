import { testClient } from "hono/testing";

import { app } from "../../index";
import type { Bindings } from "../../types";
import { createServices } from "../../services/factory";

import { testDb } from "./setup";

// Mock R2Bucket for testing
const mockR2Bucket: R2Bucket = {
  get: async () => null,
  put: async () => ({ key: "test-key" }) as any,
  delete: async () => undefined,
  list: async () => ({ objects: [] }) as any,
  head: async () => null,
} as R2Bucket;

// Mock D1Database interface for better-sqlite3
const mockD1: D1Database = {
  exec: (query: string) => {
    return Promise.resolve({ success: true, results: [], meta: {} });
  },
  prepare: (query: string) => {
    return {
      bind: (...params: any[]) => ({
        first: () => Promise.resolve(null),
        all: () => Promise.resolve([]),
        run: () => Promise.resolve({ success: true, meta: {} }),
      }),
      first: () => Promise.resolve(null),
      all: () => Promise.resolve([]),
      run: () => Promise.resolve({ success: true, meta: {} }),
    } as any;
  },
  dump: () => Promise.resolve(new ArrayBuffer(0)),
  batch: () => Promise.resolve([]),
} as D1Database;

// Mock Cloudflare Bindings for testing
export function createMockEnv(): Bindings {
  return {
    DB: mockD1,
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

// Create test services that use the testDb instead of mock D1
export function createTestServices(mockEnv: Bindings) {
  // Import the service classes at runtime to avoid circular deps
  // Use a simple mock for NotificationService instead of importing the package
  const NotificationService = class {
    constructor() {}
    async createNotificationLog() {
      return { id: "mock-log-id" };
    }
    async markNotificationAsTriggered() {
      return;
    }
  };
  const { createAuthServices } = require("@treksistem/auth");

  const { AuditService } = require("../../services/audit.service");
  const { AuthService } = require("../../services/auth.service");
  const { BillingService } = require("../../services/billing.service");
  const { DriverManagementService } = require("../../services/driver-management.service");
  const { DriverWorkflowService } = require("../../services/driver-workflow.service");
  const { LogbookService } = require("../../services/logbook.service");
  const { MasterDataService } = require("../../services/master-data.service");
  const { MitraMonitoringService } = require("../../services/mitra-monitoring.service");
  const { MitraOrderService } = require("../../services/mitra-order.service");
  const { MitraProfileService } = require("../../services/mitra-profile.service");
  const { MitraServiceManagementService } = require("../../services/mitra-service-management.service");
  const { PublicOrderService } = require("../../services/public-order.service");
  const { RateLimitService } = require("../../services/rate-limit.service");
  const { SchemaValidationService } = require("../../services/schema-validation.service");
  const { TestService } = require("../../services/test.service");
  const { UploadService } = require("../../services/upload.service");
  const { VehicleService } = require("../../services/vehicle.service");
  const { WebhookRetryService } = require("../../services/webhook-retry.service");

  // Use testDb instead of creating a new client
  const db = testDb;

  const notificationService = new NotificationService(db);
  const auditService = new AuditService(db);

  // Create auth services
  const authServices = createAuthServices(mockEnv);
  const authService = new AuthService({
    db,
    googleProvider: authServices.googleProvider,
    jwtService: authServices.jwtService,
    refreshTokenService: authServices.refreshTokenService,
    frontendUrl: mockEnv.FRONTEND_URL,
    auditService,
  });

  const billingService = new BillingService(db, auditService);
  const driverManagementService = new DriverManagementService(db, auditService);
  const driverWorkflowService = new DriverWorkflowService(db);
  const logbookService = new LogbookService(db);
  const mitraMonitoringService = new MitraMonitoringService(db);
  const mitraOrderService = new MitraOrderService(
    db,
    notificationService,
    auditService
  );
  const mitraProfileService = new MitraProfileService(db, auditService);
  const mitraServiceManagementService = new MitraServiceManagementService(
    db,
    auditService
  );
  const masterDataService = new MasterDataService(db);
  const publicOrderService = new PublicOrderService(
    db,
    notificationService,
    auditService
  );
  const rateLimitService = new RateLimitService({
    db,
    redisKV: mockEnv.RATE_LIMIT_KV,
  });
  const schemaValidationService = new SchemaValidationService({
    db,
    alertingKV: mockEnv.ALERTING_KV,
  });
  const testService = new TestService(db, mockEnv.DB);
  const uploadService = new UploadService(db, mockEnv);
  const vehicleService = new VehicleService(db, auditService);
  const webhookRetryService = new WebhookRetryService(mockEnv.DB);

  return {
    db,
    notificationService,
    auditService,
    authService,
    billingService,
    driverManagementService,
    driverWorkflowService,
    logbookService,
    mitraMonitoringService,
    mitraOrderService,
    mitraProfileService,
    mitraServiceManagementService,
    masterDataService,
    publicOrderService,
    rateLimitService,
    schemaValidationService,
    testService,
    uploadService,
    vehicleService,
    webhookRetryService,
  };
}

// Create a properly configured test client
export function createTestClient() {
  const mockEnv = createMockEnv();

  // Set test environment flag so factory uses testDb
  process.env.NODE_ENV = "test";
  (global as any).testDb = testDb;

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
