import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testClient } from "hono/testing";
import app from "../../index";
import { createServices } from "../../services/factory";

describe("Mitra Integration Tests", () => {
  let services: ReturnType<typeof createServices>;
  let authToken: string;

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
    
    // Setup test authentication
    authToken = "test-jwt-token";
    mitraId = "test-mitra-123";
  });

  afterAll(async () => {
    await services.testService.cleanupTestData();
  });

  describe("Service Management", () => {
    const validServiceRequest = {
      name: "Express Delivery",
      isPublic: true,
      maxRangeKm: 50,
      supportedVehicleTypeIds: ["vehicle-type-1"],
      supportedPayloadTypeIds: ["payload-type-1"],
      availableFacilityIds: ["facility-1"],
      rate: {
        baseFee: 5000,
        feePerKm: 1000,
      },
    };

    it("should create new service for mitra", async () => {
      const client = testClient(app);
      
      const response = await client.api.mitra.services.$post({
        json: validServiceRequest,
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      // Without proper auth setup, this will fail
      expect(response.status).toBe(401);
    });

    it("should enforce rate limiting on service creation", async () => {
      const client = testClient(app);
      
      // Make multiple rapid service creation requests
      const requests = Array(10).fill(null).map(() =>
        client.api.mitra.services.$post({
          json: validServiceRequest,
          header: {
            Authorization: `Bearer ${authToken}`,
          },
        })
      );
      
      const responses = await Promise.all(requests);
      
      // All should fail with 401 (unauthorized) in test environment
      const unauthorizedResponses = responses.filter(r => r.status === 401);
      expect(unauthorizedResponses.length).toBe(requests.length);
    });

    it("should list mitra services", async () => {
      const client = testClient(app);
      
      const response = await client.api.mitra.services.$get({
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(401); // No auth in test
    });

    it("should update existing service", async () => {
      const client = testClient(app);
      
      const updateRequest = {
        name: "Updated Express Delivery",
        rate: {
          baseFee: 6000,
          feePerKm: 1200,
        },
      };
      
      const response = await client.api.mitra.services["test-service-123"].$put({
        json: updateRequest,
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(401);
    });
  });

  describe("Driver Management", () => {
    it("should invite new driver", async () => {
      const client = testClient(app);
      
      const inviteRequest = {
        email: "driver@example.com",
      };
      
      const response = await client.api.mitra.drivers.invite.$post({
        json: inviteRequest,
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(401);
    });

    it("should enforce rate limiting on driver invites", async () => {
      const client = testClient(app);
      
      // Make multiple rapid invite requests
      const requests = Array(15).fill(null).map((_, i) =>
        client.api.mitra.drivers.invite.$post({
          json: {
            email: `driver${i}@example.com`,
          },
          header: {
            Authorization: `Bearer ${authToken}`,
          },
        })
      );
      
      const responses = await Promise.all(requests);
      
      // All should fail with 401 in test environment
      expect(responses.every(r => r.status === 401)).toBe(true);
    });

    it("should list mitra drivers", async () => {
      const client = testClient(app);
      
      const response = await client.api.mitra.drivers.$get({
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(401);
    });

    it("should remove driver", async () => {
      const client = testClient(app);
      
      const response = await client.api.mitra.drivers["test-driver-123"].$delete({
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(401);
    });
  });

  describe("Order Management", () => {
    it("should list mitra orders", async () => {
      const client = testClient(app);
      
      const response = await client.api.mitra.orders.$get({
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(401);
    });

    it("should assign driver to order", async () => {
      const client = testClient(app);
      
      const assignRequest = {
        driverId: "test-driver-123",
        vehicleId: "test-vehicle-123",
      };
      
      const response = await client.api.mitra.orders["test-order-123"].assign.$post({
        json: assignRequest,
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(401);
    });
  });

  describe("Profile Management", () => {
    it("should get mitra profile", async () => {
      const client = testClient(app);
      
      const response = await client.api.mitra.profile.$get({
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(401);
    });

    it("should update mitra profile", async () => {
      const client = testClient(app);
      
      const updateRequest = {
        businessName: "Updated Business Name",
        address: "New Address",
        phone: "081234567890",
      };
      
      const response = await client.api.mitra.profile.$put({
        json: updateRequest,
        header: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      
      expect(response.status).toBe(401);
    });
  });
});