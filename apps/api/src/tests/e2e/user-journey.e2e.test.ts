import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testDbHelpers } from "../integration/setup";
import { createTestClient } from "../integration/test-client";

/**
 * End-to-End Tests - Complete User Journeys
 * 
 * These tests simulate complete user workflows from start to finish,
 * testing the integration of multiple services and API endpoints.
 */
describe("E2E: Complete User Journeys", () => {
  let client: ReturnType<typeof createTestClient>;
  let mitraUser: any;
  let driverUser: any;
  let mitraToken: string;
  let driverToken: string;
  let mitraId: string;
  let serviceId: string;

  beforeAll(async () => {
    client = createTestClient();

    // Setup test users
    mitraUser = await testDbHelpers.createTestUser({
      email: "mitra@e2etest.com",
      name: "E2E Mitra User",
      role: "user",
    });

    driverUser = await testDbHelpers.createTestUser({
      email: "driver@e2etest.com", 
      name: "E2E Driver User",
      role: "user",
    });

    // Generate tokens
    mitraToken = await testDbHelpers.generateTestJWT(mitraUser.id, "user");
    driverToken = await testDbHelpers.generateTestJWT(driverUser.id, "user");

    // Create mitra
    const mitra = await testDbHelpers.createTestMitra({
      userId: mitraUser.id,
      businessName: "E2E Test Business",
      subscriptionStatus: "active",
      hasCompletedOnboarding: true,
    });
    mitraId = mitra.id;

    // Create a service for the mitra
    const service = await testDbHelpers.createTestService({
      mitraId: mitraId,
      name: "E2E Delivery Service",
      isPublic: true,
      maxRangeKm: 15.0,
      baseFee: 5000,
      feePerKm: 2000,
    });
    serviceId = service.id;
  });

  afterAll(async () => {
    await testDbHelpers.cleanupTestData();
  });

  describe("Mitra Business Journey", () => {
    it("should complete full mitra onboarding and service management flow", async () => {
      // 1. Mitra gets their profile
      const profileResponse = await client.api.mitra.profile.$get({
        header: { Authorization: `Bearer ${mitraToken}` },
      });
      expect(profileResponse.status).toBe(200);
      const profile = await profileResponse.json();
      expect(profile.businessName).toBe("E2E Test Business");

      // 2. Mitra lists their services
      const servicesResponse = await client.api.mitra.services.$get({
        header: { Authorization: `Bearer ${mitraToken}` },
      });
      expect(servicesResponse.status).toBe(200);
      const services = await servicesResponse.json();
      expect(services.data).toHaveLength(1);
      expect(services.data[0].name).toBe("E2E Delivery Service");

      // 3. Mitra creates a new service
      const newServiceResponse = await client.api.mitra.services.$post({
        header: { Authorization: `Bearer ${mitraToken}` },
        json: {
          name: "Express Delivery",
          description: "Fast delivery service",
          isPublic: true,
          maxRangeKm: 10.0,
        },
      });
      expect(newServiceResponse.status).toBe(201);
      const newService = await newServiceResponse.json();
      expect(newService.name).toBe("Express Delivery");

      // 4. Mitra lists services again to verify
      const updatedServicesResponse = await client.api.mitra.services.$get({
        header: { Authorization: `Bearer ${mitraToken}` },
      });
      expect(updatedServicesResponse.status).toBe(200);
      const updatedServices = await updatedServicesResponse.json();
      expect(updatedServices.data).toHaveLength(2);
    });

    it("should complete driver management workflow", async () => {
      // 1. Mitra invites a driver
      const inviteResponse = await client.api.mitra.drivers.invite.$post({
        header: { Authorization: `Bearer ${mitraToken}` },
        json: {
          email: "newdriver@e2etest.com",
        },
      });
      expect(inviteResponse.status).toBe(201);
      const invite = await inviteResponse.json();
      expect(invite.email).toBe("newdriver@e2etest.com");

      // 2. Mitra lists their drivers
      const driversResponse = await client.api.mitra.drivers.$get({
        header: { Authorization: `Bearer ${mitraToken}` },
      });
      expect(driversResponse.status).toBe(200);
      const drivers = await driversResponse.json();
      expect(drivers.data).toBeDefined();
    });
  });

  describe("Public Order Journey", () => {
    it("should complete full order creation and tracking flow", async () => {
      // 1. Public user gets available services
      const availableServicesResponse = await client.api.public.services.$get();
      expect(availableServicesResponse.status).toBe(200);
      const availableServices = await availableServicesResponse.json();
      expect(availableServices.data.length).toBeGreaterThan(0);

      // 2. Public user gets a quote for delivery
      const quoteResponse = await client.api.public.services[serviceId].quote.$post({
        json: {
          stops: [
            {
              address: "Pickup Location",
              lat: -7.98,
              lng: 112.6,
              type: "pickup",
            },
            {
              address: "Delivery Location", 
              lat: -7.99,
              lng: 112.7,
              type: "dropoff",
            },
          ],
        },
      });
      expect(quoteResponse.status).toBe(200);
      const quote = await quoteResponse.json();
      expect(quote.estimatedCost).toBeGreaterThan(0);

      // 3. Public user creates an order
      const orderResponse = await client.api.public.orders.$post({
        json: {
          serviceId: serviceId,
          ordererName: "John Doe",
          ordererPhone: "081234567890",
          recipientName: "Jane Smith",
          recipientPhone: "081234567891",
          stops: [
            {
              address: "Pickup Location",
              lat: -7.98,
              lng: 112.6,
              type: "pickup",
            },
            {
              address: "Delivery Location",
              lat: -7.99,
              lng: 112.7,
              type: "dropoff",
            },
          ],
          notes: "Handle with care",
        },
      });
      expect(orderResponse.status).toBe(201);
      const order = await orderResponse.json();
      expect(order.orderId).toBeDefined();
      expect(order.publicId).toBeDefined();
      expect(order.trackingUrl).toContain(order.publicId);

      // 4. Public user tracks the order
      const trackingResponse = await client.api.public.orders[order.publicId].track.$get();
      expect(trackingResponse.status).toBe(200);
      const tracking = await trackingResponse.json();
      expect(tracking.order.publicId).toBe(order.publicId);
      expect(tracking.order.status).toBe("pending_dispatch");
    });
  });

  describe("Mitra Order Management Journey", () => {
    it("should complete order management workflow", async () => {
      // 1. Create an order first
      const orderResponse = await client.api.public.orders.$post({
        json: {
          serviceId: serviceId,
          ordererName: "Test Customer",
          ordererPhone: "081234567890",
          recipientName: "Test Recipient",
          recipientPhone: "081234567891",
          stops: [
            {
              address: "Test Pickup",
              lat: -7.98,
              lng: 112.6,
              type: "pickup",
            },
            {
              address: "Test Delivery",
              lat: -7.99,
              lng: 112.7,
              type: "dropoff",
            },
          ],
        },
      });
      expect(orderResponse.status).toBe(201);
      const order = await orderResponse.json();

      // 2. Mitra views their orders
      const ordersResponse = await client.api.mitra.orders.$get({
        header: { Authorization: `Bearer ${mitraToken}` },
      });
      expect(ordersResponse.status).toBe(200);
      const orders = await ordersResponse.json();
      expect(orders.data.length).toBeGreaterThan(0);

      // Find the order we just created
      const createdOrder = orders.data.find((o: any) => o.publicId === order.publicId);
      expect(createdOrder).toBeDefined();
      expect(createdOrder.status).toBe("pending_dispatch");
    });
  });
});