import {
  auditLogs,
  orderReports,
  drivers,
  orders,
  orderStops,
} from "@treksistem/db";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { DriverWorkflowService } from "./driver-workflow.service";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  query: {
    orders: {
      findMany: vi.fn(),
    },
  },
};

const mockOrder = {
  id: "order-1",
  publicId: "pub-order-1",
  status: "pending_dispatch",
  ordererName: "John Doe",
  recipientName: "Jane Doe",
  assignedDriverId: "driver-1",
  serviceId: "service-1",
};

const mockUnassignedOrder = {
  id: "order-2",
  publicId: "pub-order-2",
  status: "pending_dispatch",
  ordererName: "John Doe",
  recipientName: "Jane Doe",
  assignedDriverId: null,
  serviceId: "service-1",
};

const mockDriver = {
  id: "driver-1",
  mitraId: "mitra-1",
  userId: "user-1",
  status: "active",
};

const mockService = {
  id: "service-1",
  mitraId: "mitra-1",
  name: "Food Delivery",
  isPublic: true,
};

const mockStop = {
  id: "stop-1",
  orderId: "order-1",
  sequence: 1,
  type: "pickup",
  address: "123 Main St",
  lat: 40.7128,
  lng: -74.006,
  status: "pending",
};

describe("DriverWorkflowService", () => {
  let service: DriverWorkflowService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DriverWorkflowService(mockDb as any);
  });

  describe("getAssignedOrders", () => {
    it("should return orders assigned to the driver with stops", async () => {
      const mockOrderWithStops = {
        ...mockOrder,
        stops: [mockStop],
      };

      mockDb.query.orders.findMany.mockResolvedValue([mockOrderWithStops]);

      const result = await service.getAssignedOrders("driver-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "order-1",
        publicId: "pub-order-1",
        status: "pending_dispatch",
        ordererName: "John Doe",
        recipientName: "Jane Doe",
        stops: [
          {
            id: "stop-1",
            sequence: 1,
            type: "pickup",
            address: "123 Main St",
            lat: 40.7128,
            lng: -74.006,
            status: "pending",
          },
        ],
      });
    });

    it("should return empty array when no orders assigned", async () => {
      mockDb.query.orders.findMany.mockResolvedValue([]);

      const result = await service.getAssignedOrders("driver-1");

      expect(result).toEqual([]);
    });
  });

  describe("updateDriverAvailability", () => {
    it("should update driver status and create audit log", async () => {
      const insertMock = { values: vi.fn().mockResolvedValue({}) };
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      };

      mockDb.insert.mockReturnValue(insertMock);
      mockDb.update.mockReturnValue(updateMock);

      await service.updateDriverAvailability("driver-1", "active");

      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
      expect(insertMock.values).toHaveBeenCalledWith({
        adminUserId: "driver-1",
        targetEntity: "driver",
        targetId: "driver-1",
        action: "UPDATE",
        payload: { action: "DRIVER_AVAILABILITY_CHANGED", status: "active" },
      });

      expect(mockDb.update).toHaveBeenCalledWith(drivers);
      expect(updateMock.set).toHaveBeenCalledWith({ status: "active" });
    });
  });

  describe("updateOrderStatus", () => {
    it("should update order status when transition is valid", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ ...mockOrder, status: "accepted" }),
      });

      const insertMock = { values: vi.fn().mockResolvedValue({}) };
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      };

      mockDb.insert.mockReturnValue(insertMock);
      mockDb.update.mockReturnValue(updateMock);

      await service.updateOrderStatus("driver-1", "order-1", "pickup");

      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
      expect(mockDb.update).toHaveBeenCalledWith(orders);
    });

    it("should throw error when order not found or not assigned to driver", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateOrderStatus("driver-1", "order-1", "pickup")
      ).rejects.toThrow("Order not found or not assigned to this driver");
    });

    it("should throw error when status transition is invalid", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ ...mockOrder, status: "delivered" }),
      });

      await expect(
        service.updateOrderStatus("driver-1", "order-1", "pickup")
      ).rejects.toThrow("Invalid status transition from delivered to pickup");
    });
  });

  describe("completeOrderStop", () => {
    it("should complete order stop and create audit log", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockOrder),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockStop),
        });

      const insertMock = { values: vi.fn().mockResolvedValue({}) };
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      };

      mockDb.insert.mockReturnValue(insertMock);
      mockDb.update.mockReturnValue(updateMock);

      await service.completeOrderStop("driver-1", "order-1", "stop-1");

      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
      expect(mockDb.update).toHaveBeenCalledWith(orderStops);
    });

    it("should throw error when stop not found", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockOrder),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(null),
        });

      await expect(
        service.completeOrderStop("driver-1", "order-1", "stop-1")
      ).rejects.toThrow("Stop not found for this order");
    });
  });

  describe("submitReport", () => {
    it("should submit report and create audit log", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockOrder),
      });

      const insertMock = { values: vi.fn().mockResolvedValue({}) };
      mockDb.insert.mockReturnValue(insertMock);

      const reportData = {
        stage: "pickup" as const,
        notes: "Package picked up",
        photoUrl: "https://example.com/photo.jpg",
      };

      await service.submitReport("driver-1", "order-1", reportData);

      expect(mockDb.insert).toHaveBeenCalledWith(orderReports);
      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
    });

    it("should update order status to delivered when stage is dropoff", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockOrder),
      });

      const insertMock = { values: vi.fn().mockResolvedValue({}) };
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue({}),
      };

      mockDb.insert.mockReturnValue(insertMock);
      mockDb.update.mockReturnValue(updateMock);

      const reportData = {
        stage: "dropoff" as const,
        notes: "Package delivered",
      };

      await service.submitReport("driver-1", "order-1", reportData);

      expect(mockDb.insert).toHaveBeenCalledWith(orderReports);
      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
      expect(mockDb.update).toHaveBeenCalledWith(orders);
    });

    it("should throw error when order not found", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
      });

      const reportData = {
        stage: "pickup" as const,
        notes: "Package picked up",
      };

      await expect(
        service.submitReport("driver-1", "order-1", reportData)
      ).rejects.toThrow("Order not found or not assigned to this driver");
    });
  });

  describe("claimOrder", () => {
    it("should successfully claim an unassigned order", async () => {
      // Mock order lookup - order exists and is pending_dispatch
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockUnassignedOrder),
        })
        // Mock driver lookup - driver exists and belongs to mitra-1
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockDriver),
        })
        // Mock service lookup - service belongs to mitra-1
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockService),
        });

      // Mock successful update (1 row affected)
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ changes: 1 }),
      };
      mockDb.update.mockReturnValue(updateMock);

      // Mock audit log insert
      const insertMock = { values: vi.fn().mockResolvedValue({}) };
      mockDb.insert.mockReturnValue(insertMock);

      const result = await service.claimOrder({
        orderId: "order-2",
        claimingDriverId: "driver-1",
      });

      expect(result).toEqual({
        success: true,
        message: "Order pub-order-2 claimed successfully",
        httpStatus: 200,
      });

      expect(mockDb.update).toHaveBeenCalledWith(orders);
      expect(updateMock.set).toHaveBeenCalledWith({
        assignedDriverId: "driver-1",
        status: "claimed",
      });
      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
    });

    it("should return 404 when order not found", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
      });

      const result = await service.claimOrder({
        orderId: "nonexistent-order",
        claimingDriverId: "driver-1",
      });

      expect(result).toEqual({
        success: false,
        message: "Order not found",
        httpStatus: 404,
      });
    });

    it("should return 400 when order is not in pending_dispatch status", async () => {
      const claimedOrder = { ...mockUnassignedOrder, status: "claimed" };

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(claimedOrder),
      });

      const result = await service.claimOrder({
        orderId: "order-2",
        claimingDriverId: "driver-1",
      });

      expect(result).toEqual({
        success: false,
        message: "Order is not available for claiming",
        httpStatus: 400,
      });
    });

    it("should return 404 when driver not found", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockUnassignedOrder),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(null),
        });

      const result = await service.claimOrder({
        orderId: "order-2",
        claimingDriverId: "nonexistent-driver",
      });

      expect(result).toEqual({
        success: false,
        message: "Driver not found",
        httpStatus: 404,
      });
    });

    it("should return 404 when driver belongs to different mitra", async () => {
      const differentMitraDriver = { ...mockDriver, mitraId: "mitra-2" };

      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockUnassignedOrder),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(differentMitraDriver),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockService),
        });

      const result = await service.claimOrder({
        orderId: "order-2",
        claimingDriverId: "driver-1",
      });

      expect(result).toEqual({
        success: false,
        message: "Order not found or not available to this driver",
        httpStatus: 404,
      });
    });

    it("should return 409 when order already claimed (race condition)", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockUnassignedOrder),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockDriver),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockService),
        });

      // Mock failed update (0 rows affected - another driver claimed it)
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ changes: 0 }),
      };
      mockDb.update.mockReturnValue(updateMock);

      const result = await service.claimOrder({
        orderId: "order-2",
        claimingDriverId: "driver-1",
      });

      expect(result).toEqual({
        success: false,
        message: "Order has already been claimed",
        httpStatus: 409,
      });
    });

    it("should return 404 when service not found", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockUnassignedOrder),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(mockDriver),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue(null),
        });

      const result = await service.claimOrder({
        orderId: "order-2",
        claimingDriverId: "driver-1",
      });

      expect(result).toEqual({
        success: false,
        message: "Service not found",
        httpStatus: 404,
      });
    });
  });
});
