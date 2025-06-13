import type { NotificationService } from "@treksistem/notifications";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { MitraOrderService } from "./mitra-order.service";

// Mock the dependencies
vi.mock("@treksistem/geo", () => ({
  getDistance: vi.fn().mockResolvedValue({ distanceKm: 5.2 }),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn((length?: number) => {
    if (length === 12) return "test-public-id";
    return "test-id";
  }),
}));

describe("MitraOrderService", () => {
  let service: MitraOrderService;
  let mockDb: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      batch: vi.fn().mockResolvedValue([]),
    };

    mockNotificationService = {
      generate: vi.fn().mockResolvedValue({
        logId: "notification-log-id",
        notification: {
          waLink: "https://wa.me/628123456789?text=Test%20message",
          message: "Test message",
        },
      }),
    };

    service = new MitraOrderService(
      mockDb as DrizzleD1Database<any>,
      mockNotificationService as NotificationService
    );

    process.env.PUBLIC_URL = "https://test.example.com";
  });

  describe("createManualOrder", () => {
    const validInput = {
      serviceId: "service-1",
      stops: [
        {
          address: "Pickup Location",
          lat: -6.2,
          lng: 106.8,
          type: "pickup" as const,
        },
        {
          address: "Dropoff Location",
          lat: -6.3,
          lng: 106.9,
          type: "dropoff" as const,
        },
      ],
      ordererName: "John Doe",
      ordererPhone: "628123456789",
      recipientName: "Jane Smith",
      recipientPhone: "628987654321",
      notes: "Test order",
      sendNotifications: true,
    };

    it("should create manual order successfully", async () => {
      // Mock service lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "service-1", mitraId: "mitra-1" },
      ]);
      // Mock service rates lookup
      mockDb.limit.mockResolvedValueOnce([{ baseFee: 5000, feePerKm: 2000 }]);

      const result = await service.createManualOrder(
        "mitra-1",
        "actor-1",
        validInput
      );

      expect(result).toEqual({
        orderId: "test-id",
        publicId: "test-public-id",
        trackingUrl: "https://test.example.com/track/test-public-id",
        estimatedCost: 15400, // 5000 + (2000 * 5.2)
        notification: {
          logId: "notification-log-id",
          waLink: "https://wa.me/628123456789?text=Test%20message",
          message: "Test message",
        },
      });

      expect(mockDb.batch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.anything(), // order insert
          expect.anything(), // stop inserts
          expect.anything(), // stop inserts
          expect.anything(), // audit log insert
        ])
      );
    });

    it("should throw error if service not found", async () => {
      mockDb.limit.mockResolvedValueOnce([]); // No service found

      await expect(
        service.createManualOrder("mitra-1", "actor-1", validInput)
      ).rejects.toThrow("Service not found or not owned by mitra");
    });

    it("should throw error if service not owned by mitra", async () => {
      mockDb.limit.mockResolvedValueOnce([]); // No service found due to mitra mismatch

      await expect(
        service.createManualOrder("mitra-1", "actor-1", validInput)
      ).rejects.toThrow("Service not found or not owned by mitra");
    });

    it("should create order with assigned driver", async () => {
      const inputWithDriver = {
        ...validInput,
        assignToDriverId: "driver-1",
      };

      // Mock service lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "service-1", mitraId: "mitra-1" },
      ]);
      // Mock driver lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "driver-1", mitraId: "mitra-1" },
      ]);
      // Mock service rates lookup
      mockDb.limit.mockResolvedValueOnce([{ baseFee: 5000, feePerKm: 2000 }]);

      const result = await service.createManualOrder(
        "mitra-1",
        "actor-1",
        inputWithDriver
      );

      expect(result.orderId).toBe("test-id");
      expect(mockDb.batch).toHaveBeenCalled();
    });

    it("should throw error if assigned driver not owned by mitra", async () => {
      const inputWithDriver = {
        ...validInput,
        assignToDriverId: "driver-1",
      };

      // Mock service lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "service-1", mitraId: "mitra-1" },
      ]);
      // Mock driver lookup - not found
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.createManualOrder("mitra-1", "actor-1", inputWithDriver)
      ).rejects.toThrow("Driver not found or not owned by mitra");
    });

    it("should handle notification failure gracefully", async () => {
      // Mock service lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "service-1", mitraId: "mitra-1" },
      ]);
      // Mock service rates lookup
      mockDb.limit.mockResolvedValueOnce([{ baseFee: 5000, feePerKm: 2000 }]);

      mockNotificationService.generate.mockRejectedValueOnce(
        new Error("Notification failed")
      );

      const result = await service.createManualOrder(
        "mitra-1",
        "actor-1",
        validInput
      );

      expect(result.notification).toBeUndefined();
      expect(result.orderId).toBe("test-id");
    });

    it("should use default cost when no service rates found", async () => {
      // Mock service lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "service-1", mitraId: "mitra-1" },
      ]);
      // Mock service rates lookup - no rates found
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.createManualOrder(
        "mitra-1",
        "actor-1",
        validInput
      );

      expect(result.estimatedCost).toBe(10000); // Default minimum fee
    });
  });

  describe("assignOrder", () => {
    const assignInput = {
      driverId: "driver-1",
      vehicleId: "vehicle-1",
    };

    it("should assign order successfully", async () => {
      // Mock order lookup
      mockDb.limit.mockResolvedValueOnce([
        {
          id: "order-1",
          status: "pending_dispatch",
          serviceId: "service-1",
        },
      ]);
      // Mock driver lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "driver-1", mitraId: "mitra-1" },
      ]);
      // Mock vehicle lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "vehicle-1", mitraId: "mitra-1" },
      ]);

      const result = await service.assignOrder(
        "mitra-1",
        "actor-1",
        "order-1",
        assignInput
      );

      expect(result).toEqual({
        orderId: "order-1",
        status: "accepted",
      });

      expect(mockDb.batch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.anything(), // order update
          expect.anything(), // audit log insert
        ])
      );
    });

    it("should throw error if order not found", async () => {
      mockDb.limit.mockResolvedValueOnce([]); // No order found

      await expect(
        service.assignOrder("mitra-1", "actor-1", "order-1", assignInput)
      ).rejects.toThrow("Order not found or not owned by mitra");
    });

    it("should throw error if order not in pending_dispatch status", async () => {
      mockDb.limit.mockResolvedValueOnce([
        {
          id: "order-1",
          status: "accepted",
          serviceId: "service-1",
        },
      ]);

      await expect(
        service.assignOrder("mitra-1", "actor-1", "order-1", assignInput)
      ).rejects.toThrow("Order is not in pending_dispatch status");
    });

    it("should throw error if driver not owned by mitra", async () => {
      // Mock order lookup
      mockDb.limit.mockResolvedValueOnce([
        {
          id: "order-1",
          status: "pending_dispatch",
          serviceId: "service-1",
        },
      ]);
      // Mock driver lookup - not found
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.assignOrder("mitra-1", "actor-1", "order-1", assignInput)
      ).rejects.toThrow("Driver not found or not owned by mitra");
    });

    it("should assign order without vehicle", async () => {
      const inputWithoutVehicle = {
        driverId: "driver-1",
      };

      // Mock order lookup
      mockDb.limit.mockResolvedValueOnce([
        {
          id: "order-1",
          status: "pending_dispatch",
          serviceId: "service-1",
        },
      ]);
      // Mock driver lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "driver-1", mitraId: "mitra-1" },
      ]);

      const result = await service.assignOrder(
        "mitra-1",
        "actor-1",
        "order-1",
        inputWithoutVehicle
      );

      expect(result.status).toBe("accepted");
      expect(mockDb.batch).toHaveBeenCalled();
    });

    it("should throw error if vehicle not owned by mitra", async () => {
      // Mock order lookup
      mockDb.limit.mockResolvedValueOnce([
        {
          id: "order-1",
          status: "pending_dispatch",
          serviceId: "service-1",
        },
      ]);
      // Mock driver lookup
      mockDb.limit.mockResolvedValueOnce([
        { id: "driver-1", mitraId: "mitra-1" },
      ]);
      // Mock vehicle lookup - not found
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(
        service.assignOrder("mitra-1", "actor-1", "order-1", assignInput)
      ).rejects.toThrow("Vehicle not found or not owned by mitra");
    });
  });
});
