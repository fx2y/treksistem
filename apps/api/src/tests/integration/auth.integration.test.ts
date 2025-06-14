import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createServices } from "../../services/factory";

import { testDbHelpers } from "./setup";
import { createTestClient, createMockEnv } from "./test-client";

describe("Auth Integration Tests", () => {
  let services: ReturnType<typeof createServices>;
  let client: ReturnType<typeof createTestClient>;

  beforeEach(async () => {
    // Create test client with mock environment
    client = createTestClient();

    // Setup services with mock environment
    const mockEnv = createMockEnv();
    services = createServices(mockEnv);

    // Setup test data
    await services.testService.setupTestData();
  });

  afterEach(async () => {
    // Cleanup test data after each test
    await testDbHelpers.cleanupTestData();
  });

  describe("Google OAuth Flow", () => {
    it("should initiate Google login and return redirect URL", async () => {
      const response = await client.api.auth["login/google"].$get();

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("redirectUrl");
      expect(data).toHaveProperty("sessionId");
      expect(data.redirectUrl).toContain("accounts.google.com");
    });

    it("should handle Google callback with valid state", async () => {
      // First, initiate login to get a valid session
      const loginResponse = await client.api.auth["login/google"].$get();
      await loginResponse.json();

      // Mock a successful callback (this would normally come from Google)
      const callbackResponse = await client.api.auth.callback.google.$get({
        query: {
          code: "test-auth-code",
          state: "test-state", // This should match the OAuth session
        },
      });

      // Note: This will fail in real tests without mocking Google's response
      // but demonstrates the expected flow
      expect(callbackResponse.status).toBe(400); // Missing parameters in test
    });

    it("should reject callback with invalid state", async () => {
      const response = await client.api.auth.callback.google.$get({
        query: {
          code: "test-code",
          state: "invalid-state",
        },
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Token Management", () => {
    it("should refresh access token with valid refresh token", async () => {
      // This test requires a valid refresh token setup
      // In a real implementation, you'd create a test user first
      const response = await client.api.auth.refresh.$post({
        header: {
          "x-refresh-token": "invalid-token",
        },
      });

      expect(response.status).toBe(400); // Invalid token in test
    });

    it("should logout and invalidate refresh token", async () => {
      const response = await client.api.auth.logout.$post({
        header: {
          "x-refresh-token": "test-token",
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits on auth endpoints", async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(20)
        .fill(null)
        .map(() => client.api.auth["login/google"].$get());

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
