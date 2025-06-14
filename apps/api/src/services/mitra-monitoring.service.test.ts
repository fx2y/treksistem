import type { DbClient } from "@treksistem/db";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { MitraMonitoringService } from "./mitra-monitoring.service";

describe("MitraMonitoringService", () => {
  let service: MitraMonitoringService;
  let mockDb: DbClient;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      query: {
        services: {
          findMany: vi.fn(),
        } as any,
        orders: {
          findMany: vi.fn(),
        } as any,
      } as any,
    } as any;

    service = new MitraMonitoringService(mockDb as any);
  });

  describe("getOrders", () => {
    it("should return paginated orders for a mitra", async () => {
      // Mock count query
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        }),
      });

      // Mock services query
      mockDb.query.services.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "service-1" }, { id: "service-2" }]);

      // Mock orders query
      mockDb.query.orders.findMany = vi.fn().mockResolvedValue([
        {
          id: "order-1",
          publicId: "pub-1",
          status: "pending_dispatch",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          estimatedCost: 25000,
          recipientName: "John Doe",
          assignedDriver: null,
          service: { id: "service-1" },
          stops: [],
        },
      ]);

      const result = await service.getOrders("mitra-1", {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
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
          totalItems: 5,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: 20,
        },
      });
    });

    it("should return orders with driver information when assigned", async () => {
      // Mock count query
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        }),
      });

      // Mock services query
      mockDb.query.services.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "service-1" }]);

      const mockOrders = [
        {
          id: "order-1",
          publicId: "pub-1",
          status: "accepted",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          estimatedCost: 25000,
          recipientName: "John Doe",
          assignedDriver: {
            user: {
              name: "Driver One",
            },
          },
          service: { id: "service-1" },
          stops: [],
        },
      ];

      mockDb.query.orders.findMany = vi.fn().mockResolvedValue(mockOrders);

      const result = await service.getOrders("mitra-1", {
        page: 1,
        limit: 20,
      });

      expect(result.data[0].driverName).toBe("Driver One");
    });

    it("should filter orders by status", async () => {
      // Mock count query
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 2 }]),
          }),
        }),
      });

      // Mock services query
      mockDb.query.services.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "service-1" }]);

      mockDb.query.orders.findMany = vi.fn().mockResolvedValue([]);

      await service.getOrders("mitra-1", {
        status: "delivered",
        page: 1,
        limit: 20,
      });

      expect(mockDb.query.orders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
        })
      );
    });

    it("should filter orders by date range", async () => {
      // Mock count query
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 3 }]),
          }),
        }),
      });

      // Mock services query
      mockDb.query.services.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "service-1" }]);

      mockDb.query.orders.findMany = vi.fn().mockResolvedValue([]);

      await service.getOrders("mitra-1", {
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-01-31T23:59:59Z",
        page: 1,
        limit: 20,
      });

      expect(mockDb.query.orders.findMany).toHaveBeenCalled();
    });

    it("should apply pagination correctly", async () => {
      // Mock count query
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 100 }]),
          }),
        }),
      });

      // Mock services query
      mockDb.query.services.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "service-1" }]);

      mockDb.query.orders.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getOrders("mitra-1", {
        page: 3,
        limit: 10,
      });

      expect(mockDb.query.orders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20,
        })
      );

      expect(result.meta).toEqual({
        totalItems: 100,
        totalPages: 10,
        currentPage: 3,
        itemsPerPage: 10,
      });
    });

    it("should cap limit at MAX_LIMIT", async () => {
      // Mock count query
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 50 }]),
          }),
        }),
      });

      // Mock services query
      mockDb.query.services.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "service-1" }]);

      mockDb.query.orders.findMany = vi.fn().mockResolvedValue([]);

      await service.getOrders("mitra-1", {
        page: 1,
        limit: 200, // Higher than MAX_LIMIT of 100
      });

      expect(mockDb.query.orders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100, // Should be capped at MAX_LIMIT
        })
      );
    });

    it("should only query orders for mitra's services", async () => {
      // Mock count query
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        }),
      });

      // Mock services query - only return services for mitra-1
      mockDb.query.services.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "service-1" }, { id: "service-2" }]);

      const mockOrders = [
        {
          id: "order-1",
          publicId: "pub-1",
          status: "pending_dispatch",
          createdAt: new Date("2024-01-01T10:00:00Z"),
          estimatedCost: 25000,
          recipientName: "John Doe",
          assignedDriver: null,
          service: { id: "service-1" },
          stops: [],
        },
      ];

      mockDb.query.orders.findMany = vi.fn().mockResolvedValue(mockOrders);

      const result = await service.getOrders("mitra-1", {
        page: 1,
        limit: 20,
      });

      // Verify services query was called with correct mitra ID
      expect(mockDb.query.services.findMany).toHaveBeenCalledWith({
        where: expect.anything(),
        columns: { id: true },
      });

      // Verify orders query was called with service IDs filter
      expect(mockDb.query.orders.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.anything(),
        })
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].orderId).toBe("order-1");
    });

    it("should handle empty results", async () => {
      // Mock count query
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      // Mock services query
      mockDb.query.services.findMany = vi
        .fn()
        .mockResolvedValue([{ id: "service-1" }]);

      mockDb.query.orders.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getOrders("mitra-1", {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        data: [],
        meta: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: 20,
        },
      });
    });

    it("should handle mitra with no services", async () => {
      // Mock count query
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      // Mock services query returning empty array
      mockDb.query.services.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getOrders("mitra-1", {
        page: 1,
        limit: 20,
      });

      // Should return empty result without calling orders query
      expect(mockDb.query.orders.findMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        meta: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: 20,
        },
      });
    });
  });
});
