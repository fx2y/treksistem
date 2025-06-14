import { beforeAll, afterAll } from "vitest";

// Global test setup and teardown
beforeAll(async () => {
  console.log("Setting up integration test environment...");
  
  // Initialize test database
  // Note: In a real implementation, you would:
  // 1. Create a separate test database
  // 2. Run migrations
  // 3. Seed with test data
  // 4. Setup mock external services (Google OAuth, Midtrans, etc.)
});

afterAll(async () => {
  console.log("Tearing down integration test environment...");
  
  // Clean up test database
  // Note: In a real implementation, you would:
  // 1. Drop test database or clean all tables
  // 2. Reset any external service mocks
  // 3. Clean up any temporary files
});

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
export function createTestJWT(userId: string, role: "user" | "admin" = "user"): string {
  // In a real implementation, this would use the actual JWT service
  // For now, return a mock token
  return `test-jwt-${userId}-${role}`;
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
    // In a real implementation, this would insert into the test database
    console.log("Creating test user:", userData);
    return userData;
  },
  
  async createTestMitra(mitraData = createTestMitra()) {
    // In a real implementation, this would insert into the test database
    console.log("Creating test mitra:", mitraData);
    return mitraData;
  },
  
  async createTestOrder(orderData = createTestOrder()) {
    // In a real implementation, this would insert into the test database
    console.log("Creating test order:", orderData);
    return orderData;
  },
  
  async cleanupTestData() {
    // In a real implementation, this would clean up all test data
    console.log("Cleaning up test data");
  },
};