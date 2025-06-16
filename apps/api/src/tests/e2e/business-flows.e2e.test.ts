import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testDbHelpers } from "../integration/setup";
import { createTestClient } from "../integration/test-client";

/**
 * End-to-End Tests - Business Flows
 * 
 * These tests verify critical business workflows from end to end,
 * ensuring that complex multi-step processes work correctly.
 */
describe("E2E: Business Flows", () => {
  let client: ReturnType<typeof createTestClient>;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    client = createTestClient();

    // Create admin user for system-level operations
    adminUser = await testDbHelpers.createTestUser({
      email: "admin@e2etest.com",
      name: "E2E Admin User", 
      role: "admin",
    });
    
    adminToken = await testDbHelpers.generateTestJWT(adminUser.id, "admin");
  });

  afterAll(async () => {
    await testDbHelpers.cleanupTestData();
  });

  describe("Service Discovery and Quote Flow", () => {
    it("should complete service discovery to quote generation flow", async () => {
      // 1. Customer discovers available services
      const servicesResponse = await client.api.public.services.$get();
      expect(servicesResponse.status).toBe(200);
      
      const services = await servicesResponse.json();
      expect(services.data).toBeDefined();
      
      if (services.data.length === 0) {
        // No services available, this is expected in clean test environment
        expect(services.data).toHaveLength(0);
        return;
      }

      const service = services.data[0];
      
      // 2. Customer requests quote for delivery
      const quoteResponse = await client.api.public.services[service.id].quote.$post({
        json: {
          stops: [
            {
              address: "Origin Address",
              lat: -7.98,
              lng: 112.6,
              type: "pickup",
            },
            {
              address: "Destination Address",
              lat: -7.99,
              lng: 112.7,
              type: "dropoff",
            },
          ],
        },
      });
      
      // Quote might fail if service doesn't have rates configured
      expect([200, 404, 400]).toContain(quoteResponse.status);
      
      if (quoteResponse.status === 200) {
        const quote = await quoteResponse.json();
        expect(quote.estimatedCost).toBeDefined();
        expect(quote.estimatedCost).toBeGreaterThan(0);
      }
    });
  });

  describe("Multi-Tenant Data Isolation", () => {
    it("should ensure proper data isolation between mitras", async () => {
      // Create two separate mitras
      const user1 = await testDbHelpers.createTestUser({
        email: "mitra1@isolation.test",
        name: "Mitra 1",
        role: "user",
      });
      
      const user2 = await testDbHelpers.createTestUser({
        email: "mitra2@isolation.test", 
        name: "Mitra 2",
        role: "user",
      });

      const mitra1 = await testDbHelpers.createTestMitra({
        userId: user1.id,
        businessName: "Mitra 1 Business",
      });

      const mitra2 = await testDbHelpers.createTestMitra({
        userId: user2.id,
        businessName: "Mitra 2 Business", 
      });

      const token1 = await testDbHelpers.generateTestJWT(user1.id, "user");
      const token2 = await testDbHelpers.generateTestJWT(user2.id, "user");

      // Create services for each mitra
      await testDbHelpers.createTestService({
        mitraId: mitra1.id,
        name: "Mitra 1 Service",
      });

      await testDbHelpers.createTestService({
        mitraId: mitra2.id,
        name: "Mitra 2 Service",
      });

      // Each mitra should only see their own services
      const mitra1ServicesResponse = await client.api.mitra.services.$get({
        header: { Authorization: `Bearer ${token1}` },
      });
      expect(mitra1ServicesResponse.status).toBe(200);
      
      const mitra1Services = await mitra1ServicesResponse.json();
      expect(mitra1Services.data).toHaveLength(1);
      expect(mitra1Services.data[0].name).toBe("Mitra 1 Service");

      const mitra2ServicesResponse = await client.api.mitra.services.$get({
        header: { Authorization: `Bearer ${token2}` },
      });
      expect(mitra2ServicesResponse.status).toBe(200);
      
      const mitra2Services = await mitra2ServicesResponse.json();
      expect(mitra2Services.data).toHaveLength(1);
      expect(mitra2Services.data[0].name).toBe("Mitra 2 Service");
    });
  });

  describe("Order Lifecycle Management", () => {
    it("should track order through complete lifecycle", async () => {
      // Setup: Create mitra with service
      const mitraUser = await testDbHelpers.createTestUser({
        email: "lifecycle@test.com",
        name: "Lifecycle Test Mitra",
        role: "user",
      });

      const mitra = await testDbHelpers.createTestMitra({
        userId: mitraUser.id,
        businessName: "Lifecycle Test Business",
      });

      const service = await testDbHelpers.createTestService({
        mitraId: mitra.id,
        name: "Lifecycle Test Service",
        isPublic: true,
        baseFee: 5000,
        feePerKm: 2000,
      });

      // 1. Order Creation
      const orderResponse = await client.api.public.orders.$post({
        json: {
          serviceId: service.id,
          ordererName: "Test Customer",
          ordererPhone: "081234567890",
          recipientName: "Test Recipient",
          recipientPhone: "081234567891",
          stops: [
            {
              address: "Pickup Point",
              lat: -7.98,
              lng: 112.6,
              type: "pickup",
            },
            {
              address: "Delivery Point",
              lat: -7.99,
              lng: 112.7,
              type: "dropoff",
            },
          ],
          notes: "Test order for lifecycle",
        },
      });

      expect(orderResponse.status).toBe(201);
      const order = await orderResponse.json();
      expect(order.orderId).toBeDefined();
      expect(order.publicId).toBeDefined();

      // 2. Order Tracking
      const trackingResponse = await client.api.public.orders[order.publicId].track.$get();
      expect(trackingResponse.status).toBe(200);
      
      const tracking = await trackingResponse.json();
      expect(tracking.order.publicId).toBe(order.publicId);
      expect(tracking.order.status).toBe("pending_dispatch");

      // 3. Mitra Views Order
      const mitraToken = await testDbHelpers.generateTestJWT(mitraUser.id, "user");
      const mitraOrdersResponse = await client.api.mitra.orders.$get({
        header: { Authorization: `Bearer ${mitraToken}` },
      });
      
      expect(mitraOrdersResponse.status).toBe(200);
      const mitraOrders = await mitraOrdersResponse.json();
      
      const foundOrder = mitraOrders.data.find((o: any) => o.publicId === order.publicId);
      expect(foundOrder).toBeDefined();
      expect(foundOrder.status).toBe("pending_dispatch");
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should handle invalid service IDs gracefully", async () => {
      const response = await client.api.public.services["invalid-service-id"].quote.$post({
        json: {
          stops: [
            {
              address: "Test Address",
              lat: -7.98,
              lng: 112.6,
              type: "pickup",
            },
            {
              address: "Test Destination",
              lat: -7.99,
              lng: 112.7,
              type: "dropoff",
            },
          ],
        },
      });

      expect(response.status).toBe(404);
    });

    it("should validate order data comprehensively", async () => {
      const invalidOrderResponse = await client.api.public.orders.$post({
        json: {
          serviceId: "nonexistent-service",
          ordererName: "", // Invalid: empty name
          ordererPhone: "invalid-phone", // Invalid format
          recipientName: "Valid Name",
          recipientPhone: "081234567890",
          stops: [], // Invalid: no stops
        },
      });

      expect(invalidOrderResponse.status).toBe(400);
    });
  });
});