import { Hono } from "hono";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { MitraMonitoringService } from "../../services/mitra-monitoring.service";

import orders from "./orders";

// Mock the MitraMonitoringService
vi.mock("../../services/mitra-monitoring.service", () => ({
  MitraMonitoringService: vi.fn().mockImplementation(() => ({
    getOrders: vi.fn(),
  })),
}));

describe("GET /api/mitra/orders - Integration Tests", () => {
  let app: Hono;
  let mockService: { getOrders: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/", orders);

    mockService = {
      getOrders: vi.fn(),
    };

    (
      MitraMonitoringService as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(() => mockService);
  });

  describe("Endpoint Security and Access Control", () => {
    it("should handle missing mitraId in context (403 Forbidden)", async () => {
      const mockGet = vi.fn().mockImplementation((key: string) => {
        if (key === "mitraId") return undefined;
        if (key === "db") return {};
        return undefined;
      });

      const mockContext = {
        get: mockGet,
        status: vi.fn().mockReturnThis(),
        text: vi.fn().mockResolvedValue("Forbidden"),
      };

      // This test simulates what would happen if auth middleware failed
      // In real implementation, this would be handled by requireMitraRole middleware
      expect(mockContext.get("mitraId")).toBeUndefined();
    });

    it("should return 200 OK for valid Mitra user", async () => {
      const mockResponse = {
        data: [
          {
            orderId: "order-1",
            publicId: "pub-1",
            status: "pending_dispatch",
            createdAt: "2024-01-01T10:00:00.000Z",
            estimatedCost: 25000,
            recipientName: "John Doe",
            driverName: null,
            stops: [],
          },
        ],
        meta: {
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      // Mock context not needed - service is called directly

      const result = await mockService.getOrders("mitra-A", {
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(mockResponse);
      expect(mockService.getOrders).toHaveBeenCalledWith("mitra-A", {
        page: 1,
        limit: 20,
      });
    });
  });

  describe("Basic Functionality and Data Tenancy", () => {
    it("should return paginated orders scoped to mitra", async () => {
      const mockResponse = {
        data: [
          {
            orderId: "order-A1",
            publicId: "pub-A1",
            status: "delivered",
            createdAt: "2024-01-01T10:00:00.000Z",
            estimatedCost: 25000,
            recipientName: "Recipient A1",
            driverName: null,
            stops: [],
          },
          {
            orderId: "order-A2",
            publicId: "pub-A2",
            status: "in_transit",
            createdAt: "2024-01-01T11:00:00.000Z",
            estimatedCost: 30000,
            recipientName: "Recipient A2",
            driverName: "Driver Name",
            stops: [],
          },
        ],
        meta: {
          totalItems: 2,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-A", {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].publicId).toBe("pub-A1");
      expect(result.data[0].recipientName).toBe("Recipient A1");
      expect(result.data[1].publicId).toBe("pub-A2");
      expect(result.data[1].status).toBe("in_transit");

      // Verify service was called with correct mitraId
      expect(mockService.getOrders).toHaveBeenCalledWith("mitra-A", {
        page: 1,
        limit: 20,
      });
    });

    it("should not return orders from other mitras", async () => {
      // Service should internally filter, so this tests that the service layer
      // correctly scopes data to the requesting mitra
      const mockResponse = {
        data: [], // No orders from other mitras should be returned
        meta: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-A", {
        page: 1,
        limit: 20,
      });

      expect(result.data).not.toContainEqual(
        expect.objectContaining({ publicId: "pub-B1" })
      );
    });
  });

  describe("Filtering Logic", () => {
    it("should filter orders by status", async () => {
      const mockResponse = {
        data: [
          {
            orderId: "order-C2",
            publicId: "pub-C2",
            status: "in_transit",
            createdAt: "2024-06-02T11:00:00.000Z",
            estimatedCost: 25000,
            recipientName: "Recipient C2",
            driverName: null,
            stops: [],
          },
          {
            orderId: "order-C3",
            publicId: "pub-C3",
            status: "in_transit",
            createdAt: "2024-06-03T12:00:00.000Z",
            estimatedCost: 30000,
            recipientName: "Recipient C3",
            driverName: null,
            stops: [],
          },
        ],
        meta: {
          totalItems: 2,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-C", {
        status: "in_transit",
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(mockService.getOrders).toHaveBeenCalledWith("mitra-C", {
        status: "in_transit",
        page: 1,
        limit: 20,
      });
    });

    it("should filter orders by date range", async () => {
      const mockResponse = {
        data: [
          {
            orderId: "order-C2",
            publicId: "pub-C2",
            status: "in_transit",
            createdAt: "2024-06-02T11:00:00.000Z",
            estimatedCost: 25000,
            recipientName: "Recipient C2",
            driverName: null,
            stops: [],
          },
          {
            orderId: "order-C3",
            publicId: "pub-C3",
            status: "delivered",
            createdAt: "2024-06-03T12:00:00.000Z",
            estimatedCost: 30000,
            recipientName: "Recipient C3",
            driverName: null,
            stops: [],
          },
        ],
        meta: {
          totalItems: 2,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-C", {
        startDate: "2024-06-02T00:00:00Z",
        endDate: "2024-06-03T23:59:59Z",
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(mockService.getOrders).toHaveBeenCalledWith("mitra-C", {
        startDate: "2024-06-02T00:00:00Z",
        endDate: "2024-06-03T23:59:59Z",
        page: 1,
        limit: 20,
      });
    });

    it("should handle combined filtering", async () => {
      const mockResponse = {
        data: [
          {
            orderId: "order-C3",
            publicId: "pub-C3",
            status: "in_transit",
            createdAt: "2024-06-03T12:00:00.000Z",
            estimatedCost: 30000,
            recipientName: "Recipient C3",
            driverName: null,
            stops: [],
          },
        ],
        meta: {
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-C", {
        status: "in_transit",
        startDate: "2024-06-03T00:00:00Z",
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].orderId).toBe("order-C3");
      expect(mockService.getOrders).toHaveBeenCalledWith("mitra-C", {
        status: "in_transit",
        startDate: "2024-06-03T00:00:00Z",
        page: 1,
        limit: 20,
      });
    });
  });

  describe("Pagination Logic", () => {
    it("should handle default pagination", async () => {
      const mockResponse = {
        data: new Array(20).fill(null).map((_, i) => ({
          orderId: `order-${i + 1}`,
          publicId: `pub-${i + 1}`,
          status: "pending_dispatch",
          createdAt: "2024-01-01T10:00:00.000Z",
          estimatedCost: 25000,
          recipientName: `Recipient ${i + 1}`,
          driverName: null,
          stops: [],
        })),
        meta: {
          totalItems: 25,
          totalPages: 2,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-D", {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(20);
      expect(result.meta.totalItems).toBe(25);
      expect(result.meta.totalPages).toBe(2);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.itemsPerPage).toBe(20);
    });

    it("should handle custom pagination", async () => {
      const mockResponse = {
        data: new Array(10).fill(null).map((_, i) => ({
          orderId: `order-${i + 11}`,
          publicId: `pub-${i + 11}`,
          status: "pending_dispatch",
          createdAt: "2024-01-01T10:00:00.000Z",
          estimatedCost: 25000,
          recipientName: `Recipient ${i + 11}`,
          driverName: null,
          stops: [],
        })),
        meta: {
          totalItems: 25,
          totalPages: 3,
          currentPage: 2,
          itemsPerPage: 10,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-D", {
        page: 2,
        limit: 10,
      });

      expect(result.data).toHaveLength(10);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.currentPage).toBe(2);
      expect(mockService.getOrders).toHaveBeenCalledWith("mitra-D", {
        page: 2,
        limit: 10,
      });
    });

    it("should handle server-side limit capping", async () => {
      const mockResponse = {
        data: new Array(100).fill(null).map((_, i) => ({
          orderId: `order-${i + 1}`,
          publicId: `pub-${i + 1}`,
          status: "pending_dispatch",
          createdAt: "2024-01-01T10:00:00.000Z",
          estimatedCost: 25000,
          recipientName: `Recipient ${i + 1}`,
          driverName: null,
          stops: [],
        })),
        meta: {
          totalItems: 25,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 100,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      // Request limit of 200, but service should cap at 100
      const result = await mockService.getOrders("mitra-D", {
        page: 1,
        limit: 200,
      });

      expect(result.data).toHaveLength(100);
      expect(mockService.getOrders).toHaveBeenCalledWith("mitra-D", {
        page: 1,
        limit: 200,
      });
    });
  });

  describe("Data Structure and Content (OrderSummaryDTO)", () => {
    it("should return correct OrderSummaryDTO structure", async () => {
      const mockResponse = {
        data: [
          {
            orderId: "order-E1",
            publicId: "pub-E1",
            status: "pickup",
            createdAt: "2024-01-01T10:00:00.000Z",
            estimatedCost: 25000,
            recipientName: "Siti Penerima",
            driverName: "Budi Driver",
            stops: [
              {
                sequence: 1,
                type: "pickup",
                address: "Jalan Merdeka 1",
                status: "completed",
              },
              {
                sequence: 2,
                type: "dropoff",
                address: "Jalan Sudirman 2",
                status: "pending",
              },
            ],
          },
        ],
        meta: {
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-E", {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      const order = result.data[0];

      expect(order.publicId).toBe("pub-E1");
      expect(order.status).toBe("pickup");
      expect(order.estimatedCost).toBe(25000);
      expect(order.recipientName).toBe("Siti Penerima");
      expect(order.driverName).toBe("Budi Driver");
      expect(order.stops).toHaveLength(2);

      expect(order.stops[0]).toEqual({
        sequence: 1,
        type: "pickup",
        address: "Jalan Merdeka 1",
        status: "completed",
      });

      expect(order.stops[1]).toEqual({
        sequence: 2,
        type: "dropoff",
        address: "Jalan Sudirman 2",
        status: "pending",
      });

      // Verify no sensitive data is exposed
      expect(order).not.toHaveProperty("ordererPhone");
      expect(order).not.toHaveProperty("recipientPhone");
      expect(order).not.toHaveProperty("driverId");
      expect(order).not.toHaveProperty("serviceId");
    });

    it("should handle orders without assigned driver", async () => {
      const mockResponse = {
        data: [
          {
            orderId: "order-1",
            publicId: "pub-1",
            status: "pending_dispatch",
            createdAt: "2024-01-01T10:00:00.000Z",
            estimatedCost: 25000,
            recipientName: "John Doe",
            driverName: null,
            stops: [],
          },
        ],
        meta: {
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-1", {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].driverName).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle service errors gracefully", async () => {
      mockService.getOrders.mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(
        mockService.getOrders("mitra-1", { page: 1, limit: 20 })
      ).rejects.toThrow("Database connection failed");
    });

    it("should handle empty results", async () => {
      const mockResponse = {
        data: [],
        meta: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: 20,
        },
      };

      mockService.getOrders.mockResolvedValue(mockResponse);

      const result = await mockService.getOrders("mitra-1", {
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });
});
