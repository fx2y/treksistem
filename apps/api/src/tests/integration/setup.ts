import fs from "fs";
import path from "path";

import * as schema from "@treksistem/db/schema";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, afterAll } from "vitest";

// Test database instance
let testDb: ReturnType<typeof drizzle>;
let sqliteDb: Database.Database;

// Global test setup and teardown
beforeAll(async () => {
  console.log("Setting up integration test environment...");

  // 1. Create a separate in-memory test database
  sqliteDb = new Database(":memory:");
  testDb = drizzle(sqliteDb, { schema });

  // 2. Run migrations
  const migrationsPath = path.join(
    process.cwd(),
    "../../packages/db/migrations"
  );
  if (fs.existsSync(migrationsPath)) {
    await migrate(testDb, { migrationsFolder: migrationsPath });
    console.log("Test database migrations applied successfully");
  } else {
    console.warn("Migrations folder not found, skipping migration");
  }

  // 3. Seed with test data (handled by individual test helper functions)

  // 4. Setup mock external services
  setupMockServices();
});

afterAll(async () => {
  console.log("Tearing down integration test environment...");

  // Clean up test database
  if (sqliteDb) {
    sqliteDb.close();
  }

  // Reset any external service mocks
  teardownMockServices();
});

// Export test database for use in tests
export { testDb };

// Setup and teardown mock services
function setupMockServices() {
  // Mock Google OAuth endpoints
  // Mock Midtrans webhooks
  // Mock other external services
  console.log("Mock services initialized");
}

function teardownMockServices() {
  // Clean up any global mocks
  console.log("Mock services cleaned up");
}

// Test utilities and helpers
export const TEST_CONFIG = {
  // Test environment variables
  JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  FRONTEND_URL: "http://localhost:3000",

  // Test data IDs
  TEST_USER_ID: "test-user-123",
  TEST_MITRA_ID: "test-mitra-123",
  TEST_DRIVER_ID: "test-driver-123",
  TEST_SERVICE_ID: "test-service-123",
  TEST_ORDER_ID: "test-order-123",

  // Test credentials
  VALID_JWT_TOKEN: "test-valid-jwt-token",
  ADMIN_JWT_TOKEN: "test-admin-jwt-token",
  DRIVER_JWT_TOKEN: "test-driver-jwt-token",
  MITRA_JWT_TOKEN: "test-mitra-jwt-token",
};

// Helper function to create test JWT tokens
export async function createTestJWT(
  userId: string,
  role: "user" | "admin" = "user"
): Promise<string> {
  // Import JWT service for actual token creation
  const { sign } = await import("hono/jwt");
  const payload = {
    sub: userId,
    role: role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
  };

  try {
    return await sign(payload, TEST_CONFIG.JWT_SECRET);
  } catch (error) {
    console.warn("Failed to create real JWT, using mock token:", error);
    return `test-jwt-${userId}-${role}`;
  }
}

// Helper function to create test user data
export function createTestUser(overrides: Partial<any> = {}) {
  return {
    id: TEST_CONFIG.TEST_USER_ID,
    googleId: "test-google-id-123",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
    role: "user",
    ...overrides,
  };
}

// Helper function to create test mitra data
export function createTestMitra(overrides: Partial<any> = {}) {
  return {
    id: TEST_CONFIG.TEST_MITRA_ID,
    userId: TEST_CONFIG.TEST_USER_ID,
    businessName: "Test Business",
    address: "Test Address",
    phone: "081234567890",
    lat: -7.98,
    lng: 112.6,
    subscriptionStatus: "active",
    activeDriverLimit: 5,
    hasCompletedOnboarding: true,
    ...overrides,
  };
}

// Helper function to create test order data
export function createTestOrder(overrides: Partial<any> = {}) {
  return {
    id: TEST_CONFIG.TEST_ORDER_ID,
    publicId: "order-123",
    serviceId: TEST_CONFIG.TEST_SERVICE_ID,
    ordererName: "John Doe",
    ordererPhone: "081234567890",
    recipientName: "Jane Doe",
    recipientPhone: "081234567891",
    estimatedCost: 15000,
    status: "pending_dispatch",
    notes: "Test order",
    stops: [
      {
        address: "Pickup Location",
        lat: -7.98,
        lng: 112.6,
        type: "pickup",
        sequence: 1,
      },
      {
        address: "Dropoff Location",
        lat: -7.99,
        lng: 112.7,
        type: "dropoff",
        sequence: 2,
      },
    ],
    ...overrides,
  };
}

// Mock external services for testing
export const mockGoogleOAuth = {
  // Mock Google OAuth responses
  userInfo: {
    id: "google-user-123",
    email: "test@example.com",
    name: "Test User",
    picture: "https://example.com/avatar.jpg",
  },

  tokens: {
    access_token: "mock-google-access-token",
    refresh_token: "mock-google-refresh-token",
    expires_in: 3600,
  },
};

export const mockMidtrans = {
  // Mock Midtrans responses
  charge: {
    status_code: "200",
    status_message: "Success",
    transaction_id: "test-transaction-123",
    order_id: "invoice_test-invoice-123",
    payment_type: "qris",
    transaction_time: "2023-01-01 12:00:00",
    transaction_status: "capture",
    fraud_status: "accept",
  },
};

// Database helper functions for testing
export const testDbHelpers = {
  async createTestUser(userData = createTestUser()) {
    const [user] = await testDb
      .insert(schema.users)
      .values({
        googleId: userData.googleId,
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.avatarUrl,
        role: userData.role,
      })
      .returning();
    return user;
  },

  async generateTestJWT(
    userId: string,
    role: "user" | "admin" = "user"
  ): Promise<string> {
    return await createTestJWT(userId, role);
  },

  async createTestMitra(mitraData = createTestMitra()) {
    const [mitra] = await testDb
      .insert(schema.mitras)
      .values({
        userId: mitraData.userId,
        businessName: mitraData.businessName,
        address: mitraData.address,
        phone: mitraData.phone,
        lat: mitraData.lat,
        lng: mitraData.lng,
        subscriptionStatus: mitraData.subscriptionStatus,
        activeDriverLimit: mitraData.activeDriverLimit,
        hasCompletedOnboarding: mitraData.hasCompletedOnboarding,
      })
      .returning();
    return mitra;
  },

  async createTestService(serviceData: any) {
    const [service] = await testDb
      .insert(schema.services)
      .values({
        mitraId: serviceData.mitraId,
        name: serviceData.name,
        description: serviceData.description,
        baseFare: serviceData.baseFare,
        perKmRate: serviceData.perKmRate,
        isActive: serviceData.isActive ?? true,
      })
      .returning();
    return service;
  },

  async createTestOrder(orderData = createTestOrder()) {
    const [order] = await testDb
      .insert(schema.orders)
      .values({
        serviceId: orderData.serviceId,
        ordererName: orderData.ordererName,
        ordererPhone: orderData.ordererPhone,
        recipientName: orderData.recipientName,
        recipientPhone: orderData.recipientPhone,
        estimatedCost: orderData.estimatedCost,
        status: orderData.status,
        notes: orderData.notes,
      })
      .returning();

    // Create order stops
    if (orderData.stops) {
      for (const stop of orderData.stops) {
        await testDb.insert(schema.orderStops).values({
          orderId: order.id,
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
          type: stop.type,
          sequence: stop.sequence,
          status: "pending",
        });
      }
    }

    return order;
  },

  async cleanupTestData() {
    // Clean up all test data in proper order (respecting foreign keys)
    await testDb.delete(schema.orderStops);
    await testDb.delete(schema.orders);
    await testDb.delete(schema.services);
    await testDb.delete(schema.drivers);
    await testDb.delete(schema.vehicles);
    await testDb.delete(schema.mitras);
    await testDb.delete(schema.refreshTokens);
    await testDb.delete(schema.oauthSessions);
    await testDb.delete(schema.users);
    console.log("Test data cleaned up");
  },
};
