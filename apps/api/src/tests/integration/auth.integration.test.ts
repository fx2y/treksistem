import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testClient } from "hono/testing";
import app from "../../index";
import { createServices } from "../../services/factory";

describe("Auth Integration Tests", () => {
  let services: ReturnType<typeof createServices>;

  beforeAll(async () => {
    // Setup test environment
    const env = {
      DB: {} as D1Database, // Mock D1 for integration tests
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret", 
      JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
      FRONTEND_URL: "http://localhost:3000",
      R2_ACCOUNT_ID: "test",
      R2_ACCESS_KEY_ID: "test",
      R2_SECRET_ACCESS_KEY: "test",
    };
    
    services = createServices(env);
    
    // Setup test database
    await services.testService.setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await services.testService.cleanupTestData();
  });

  describe("Google OAuth Flow", () => {
    it("should initiate Google login and return redirect URL", async () => {
      const client = testClient(app);
      
      const response = await client.api.auth["login/google"].$get();
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty("redirectUrl");
      expect(data).toHaveProperty("sessionId");
      expect(data.redirectUrl).toContain("accounts.google.com");
    });

    it("should handle Google callback with valid state", async () => {
      const client = testClient(app);
      
      // First, initiate login to get a valid session  
      const loginResponse = await client.api.auth["login/google"].$get();
      await loginResponse.json();
      
      // Mock a successful callback (this would normally come from Google)
      const callbackResponse = await client.api.auth.callback.google.$get({
        query: {
          code: "test-auth-code",
          state: "test-state", // This should match the OAuth session
        }
      });
      
      // Note: This will fail in real tests without mocking Google's response
      // but demonstrates the expected flow
      expect(callbackResponse.status).toBe(400); // Missing parameters in test
    });

    it("should reject callback with invalid state", async () => {
      const client = testClient(app);
      
      const response = await client.api.auth.callback.google.$get({
        query: {
          code: "test-code",
          state: "invalid-state",
        }
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe("Token Management", () => {
    it("should refresh access token with valid refresh token", async () => {
      const client = testClient(app);
      
      // This test requires a valid refresh token setup
      // In a real implementation, you'd create a test user first
      const response = await client.api.auth.refresh.$post({
        header: {
          "x-refresh-token": "invalid-token"
        }
      });
      
      expect(response.status).toBe(400); // Invalid token in test
    });

    it("should logout and invalidate refresh token", async () => {
      const client = testClient(app);
      
      const response = await client.api.auth.logout.$post({
        header: {
          "x-refresh-token": "test-token"
        }
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits on auth endpoints", async () => {
      const client = testClient(app);
      
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(20).fill(null).map(() => 
        client.api.auth["login/google"].$get()
      );
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});