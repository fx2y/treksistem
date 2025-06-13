import type { DrizzleD1Database } from "drizzle-orm/d1";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { VehicleService } from "./vehicle.service";

describe("VehicleService", () => {
  let service: VehicleService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    // Chain all methods properly
    Object.keys(mockDb).forEach(key => {
      mockDb[key] = vi.fn().mockReturnValue(mockDb);
    });

    service = new VehicleService(mockDb as DrizzleD1Database);
  });

  describe("getVehicles", () => {
    it("should return vehicles for a given mitra", async () => {
      const mockVehicles = [
        {
          id: "vehicle-1",
          licensePlate: "N 1234 ABC",
          description: "Honda Vario 125",
          createdAt: new Date("2023-01-01"),
        },
        {
          id: "vehicle-2",
          licensePlate: "N 5678 DEF",
          description: null,
          createdAt: new Date("2023-01-02"),
        },
      ];

      mockDb.where.mockResolvedValueOnce(mockVehicles);

      const result = await service.getVehicles("mitra-1");

      expect(result).toEqual([
        {
          id: "vehicle-1",
          licensePlate: "N 1234 ABC",
          description: "Honda Vario 125",
          createdAt: "2023-01-01T00:00:00.000Z",
        },
        {
          id: "vehicle-2",
          licensePlate: "N 5678 DEF",
          description: null,
          createdAt: "2023-01-02T00:00:00.000Z",
        },
      ]);
    });

    it("should return empty array when no vehicles found", async () => {
      mockDb.where.mockResolvedValueOnce([]);

      const result = await service.getVehicles("mitra-1");

      expect(result).toEqual([]);
    });
  });

  describe("getVehicleById", () => {
    it("should return vehicle when found", async () => {
      const mockVehicle = {
        id: "vehicle-1",
        licensePlate: "N 1234 ABC",
        description: "Honda Vario 125",
        createdAt: new Date("2023-01-01"),
      };

      mockDb.limit.mockResolvedValueOnce([mockVehicle]);

      const result = await service.getVehicleById("mitra-1", "vehicle-1");

      expect(result).toEqual({
        id: "vehicle-1",
        licensePlate: "N 1234 ABC",
        description: "Honda Vario 125",
        createdAt: "2023-01-01T00:00:00.000Z",
      });
    });

    it("should return null when vehicle not found", async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.getVehicleById("mitra-1", "nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createVehicle", () => {
    it("should create vehicle with normalized license plate", async () => {
      const mockCreatedVehicle = {
        id: "vehicle-1",
        licensePlate: "N 1234 ABC",
        description: "Honda Vario 125",
        createdAt: new Date("2023-01-01"),
      };

      mockDb.returning.mockResolvedValueOnce([mockCreatedVehicle]);

      const result = await service.createVehicle("mitra-1", {
        licensePlate: " n 1234 abc ",
        description: "Honda Vario 125",
      });

      expect(result).toEqual({
        id: "vehicle-1",
        licensePlate: "N 1234 ABC",
        description: "Honda Vario 125",
        createdAt: "2023-01-01T00:00:00.000Z",
      });

      expect(mockDb.values).toHaveBeenCalledWith({
        mitraId: "mitra-1",
        licensePlate: "N 1234 ABC",
        description: "Honda Vario 125",
      });
    });

    it("should create vehicle without description", async () => {
      const mockCreatedVehicle = {
        id: "vehicle-1",
        licensePlate: "N 1234 ABC",
        description: null,
        createdAt: new Date("2023-01-01"),
      };

      mockDb.returning.mockResolvedValueOnce([mockCreatedVehicle]);

      const result = await service.createVehicle("mitra-1", {
        licensePlate: "N 1234 ABC",
      });

      expect(result).toEqual({
        id: "vehicle-1",
        licensePlate: "N 1234 ABC",
        description: null,
        createdAt: "2023-01-01T00:00:00.000Z",
      });

      expect(mockDb.values).toHaveBeenCalledWith({
        mitraId: "mitra-1",
        licensePlate: "N 1234 ABC",
        description: null,
      });
    });
  });

  describe("updateVehicle", () => {
    it("should update vehicle with normalized license plate", async () => {
      const mockUpdatedVehicle = {
        id: "vehicle-1",
        licensePlate: "N 5678 DEF",
        description: "Updated description",
        createdAt: new Date("2023-01-01"),
      };

      mockDb.returning.mockResolvedValueOnce([mockUpdatedVehicle]);

      const result = await service.updateVehicle("mitra-1", "vehicle-1", {
        licensePlate: " n 5678 def ",
        description: "Updated description",
      });

      expect(result).toEqual({
        id: "vehicle-1",
        licensePlate: "N 5678 DEF",
        description: "Updated description",
        createdAt: "2023-01-01T00:00:00.000Z",
      });

      expect(mockDb.set).toHaveBeenCalledWith({
        updatedAt: expect.any(Date),
        licensePlate: "N 5678 DEF",
        description: "Updated description",
      });
    });

    it("should update only license plate", async () => {
      const mockUpdatedVehicle = {
        id: "vehicle-1",
        licensePlate: "N 5678 DEF",
        description: "Original description",
        createdAt: new Date("2023-01-01"),
      };

      mockDb.returning.mockResolvedValueOnce([mockUpdatedVehicle]);

      await service.updateVehicle("mitra-1", "vehicle-1", {
        licensePlate: "N 5678 DEF",
      });

      expect(mockDb.set).toHaveBeenCalledWith({
        updatedAt: expect.any(Date),
        licensePlate: "N 5678 DEF",
      });
    });

    it("should throw error when vehicle not found", async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        service.updateVehicle("mitra-1", "nonexistent", {
          licensePlate: "N 1234 ABC",
        })
      ).rejects.toThrow("Vehicle not found");
    });
  });

  describe("deleteVehicle", () => {
    it("should delete vehicle successfully", async () => {
      // For the first test, we need to reset and configure the mock chain
      mockDb.returning.mockResolvedValueOnce([{ id: "vehicle-1" }]);

      const result = await service.deleteVehicle("mitra-1", "vehicle-1");

      expect(result).toEqual({ success: true });
    });

    it("should return false when vehicle not found", async () => {
      // For the second test, reset and configure again
      mockDb.returning.mockResolvedValueOnce([]);

      const result = await service.deleteVehicle("mitra-1", "nonexistent");

      expect(result).toEqual({ success: false });
    });
  });
});
