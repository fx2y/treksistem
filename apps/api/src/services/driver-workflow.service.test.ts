import { auditLogs, orderReports, drivers } from "@treksistem/db";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { DriverWorkflowService } from "./driver-workflow.service";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  batch: vi.fn(),
};

const mockOrder = {
  id: "order-1",
  publicId: "pub-order-1",
  status: "pending_dispatch",
  ordererName: "John Doe",
  recipientName: "Jane Doe",
  assignedDriverId: "driver-1",
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
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockOrder]),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([mockStop]),
      });

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
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });

      const result = await service.getAssignedOrders("driver-1");

      expect(result).toEqual([]);
    });
  });

  describe("updateDriverAvailability", () => {
    it("should update driver status and create audit log", async () => {
      const insertMock = { values: vi.fn().mockReturnValue("audit-insert") };
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue("driver-update"),
      };

      mockDb.insert.mockReturnValue(insertMock);
      mockDb.update.mockReturnValue(updateMock);
      mockDb.batch.mockResolvedValue([]);

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
      expect(mockDb.batch).toHaveBeenCalledWith([
        "audit-insert",
        "driver-update",
      ]);
    });
  });

  describe("updateOrderStatus", () => {
    it("should update order status when transition is valid", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ ...mockOrder, status: "accepted" }),
      });

      const insertMock = { values: vi.fn().mockReturnValue("audit-insert") };
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue("order-update"),
      };

      mockDb.insert.mockReturnValue(insertMock);
      mockDb.update.mockReturnValue(updateMock);
      mockDb.batch.mockResolvedValue([]);

      await service.updateOrderStatus("driver-1", "order-1", "pickup");

      expect(mockDb.batch).toHaveBeenCalledWith([
        "audit-insert",
        "order-update",
      ]);
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

      const insertMock = { values: vi.fn().mockReturnValue("audit-insert") };
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue("stop-update"),
      };

      mockDb.insert.mockReturnValue(insertMock);
      mockDb.update.mockReturnValue(updateMock);
      mockDb.batch.mockResolvedValue([]);

      await service.completeOrderStop("driver-1", "order-1", "stop-1");

      expect(mockDb.batch).toHaveBeenCalledWith([
        "audit-insert",
        "stop-update",
      ]);
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

      const insertMock = { values: vi.fn().mockReturnValue("insert-mock") };
      mockDb.insert.mockReturnValue(insertMock);
      mockDb.batch.mockResolvedValue([]);

      const reportData = {
        stage: "pickup" as const,
        notes: "Package picked up",
        photoUrl: "https://example.com/photo.jpg",
      };

      await service.submitReport("driver-1", "order-1", reportData);

      expect(mockDb.insert).toHaveBeenCalledWith(orderReports);
      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
      expect(mockDb.batch).toHaveBeenCalledWith(["insert-mock", "insert-mock"]);
    });

    it("should update order status to delivered when stage is dropoff", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockOrder),
      });

      const insertMock = { values: vi.fn().mockReturnValue("insert-mock") };
      const updateMock = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnValue("update-mock"),
      };

      mockDb.insert.mockReturnValue(insertMock);
      mockDb.update.mockReturnValue(updateMock);
      mockDb.batch.mockResolvedValue([]);

      const reportData = {
        stage: "dropoff" as const,
        notes: "Package delivered",
      };

      await service.submitReport("driver-1", "order-1", reportData);

      expect(mockDb.batch).toHaveBeenCalledWith([
        "insert-mock",
        "insert-mock",
        "update-mock",
      ]);
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
});
