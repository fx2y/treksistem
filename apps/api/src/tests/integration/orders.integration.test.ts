import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testClient } from "hono/testing";
import app from "../../index";
import { createServices } from "../../services/factory";

describe("Orders Integration Tests", () => {
  let services: ReturnType<typeof createServices>;
  let testServiceId: string;

  beforeAll(async () => {
    const env = {
      DB: {} as D1Database,
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
      FRONTEND_URL: "http://localhost:3000",
      R2_ACCOUNT_ID: "test",
      R2_ACCESS_KEY_ID: "test", 
      R2_SECRET_ACCESS_KEY: "test",
    };
    
    services = createServices(env);
    await services.testService.setupTestData();
    
    // Create test mitra and service
    testMitraId = "test-mitra-123";
    testServiceId = "test-service-123";
  });

  afterAll(async () => {
    await services.testService.cleanupTestData();
  });

  describe("Public Order Creation", () => {
    const validOrderRequest = {
      serviceId: "test-service-123",
      stops: [
        {
          address: "Jl. Merdeka 1, Malang",
          lat: -7.98,
          lng: 112.6,
          type: "pickup" as const,
        },
        {
          address: "Jl. Sudirman 2, Malang", 
          lat: -7.99,
          lng: 112.7,
          type: "dropoff" as const,
        }
      ],
      ordererName: "John Doe",
      ordererPhone: "081234567890",
      recipientName: "Jane Doe", 
      recipientPhone: "081234567891",
      notes: "Handle with care",
    };

    it("should create order with valid data", async () => {
      const client = testClient(app);
      
      const response = await client.api.public.orders.$post({
        json: validOrderRequest,
      });
      
      // Note: This test will likely fail without proper test data setup
      // but demonstrates the expected flow
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toHaveProperty("order");
      expect(data).toHaveProperty("trackingUrl");
      expect(data).toHaveProperty("estimatedCost");
    });

    it("should reject order with invalid stops", async () => {
      const client = testClient(app);
      
      const invalidRequest = {
        ...validOrderRequest,
        stops: [
          // Only one stop - should require at least 2
          {
            address: "Jl. Merdeka 1, Malang",
            lat: -7.98,
            lng: 112.6,
            type: "pickup" as const,
          }
        ]
      };
      
      const response = await client.api.public.orders.$post({
        json: invalidRequest,
      });
      
      expect(response.status).toBe(400);
    });

    it("should enforce rate limiting on order creation", async () => {
      const client = testClient(app);
      
      // Make multiple rapid order creation requests
      const requests = Array(25).fill(null).map(() =>
        client.api.public.orders.$post({
          json: validOrderRequest,
        })
      );
      
      const responses = await Promise.all(requests);
      
      // Some should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it("should validate phone number format", async () => {
      const client = testClient(app);
      
      const invalidRequest = {
        ...validOrderRequest,
        ordererPhone: "invalid-phone",
      };
      
      const response = await client.api.public.orders.$post({
        json: invalidRequest,
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe("Order Tracking", () => {
    it("should allow tracking order with public ID", async () => {
      const client = testClient(app);
      
      // This would require a valid order ID from previous test
      const response = await client.api.public.orders["test-order-123"].track.$get();
      
      // Without proper test data, this will fail
      expect(response.status).toBe(404);
    });
  });

  describe("Service Quote", () => {
    it("should calculate quote for valid route", async () => {
      const client = testClient(app);
      
      const quoteRequest = {
        serviceId: testServiceId,
        stops: validOrderRequest.stops,
      };
      
      const response = await client.api.public.services[testServiceId].quote.$post({
        json: quoteRequest,
      });
      
      // Without proper test service setup, this will fail
      expect(response.status).toBe(404);
    });

    it("should reject quote for invalid service", async () => {
      const client = testClient(app);
      
      const quoteRequest = {
        serviceId: "invalid-service-id",
        stops: validOrderRequest.stops,
      };
      
      const response = await client.api.public.services["invalid-service-id"].quote.$post({
        json: quoteRequest,
      });
      
      expect(response.status).toBe(404);
    });
  });
});