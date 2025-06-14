import type { DbClient } from "@treksistem/db";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { MitraServiceManagementService } from "./mitra-service-management.service";

describe("MitraServiceManagementService", () => {
  let service: MitraServiceManagementService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      transaction: vi.fn(),
    };

    service = new MitraServiceManagementService(mockDb as DbClient);
  });

  describe("createService", () => {
    const validInput = {
      name: "Food Delivery",
      isPublic: true,
      maxRangeKm: 10,
      supportedVehicleTypeIds: ["vehicle-type-1"],
      supportedPayloadTypeIds: ["payload-type-1"],
      availableFacilityIds: ["facility-1"],
      rate: {
        baseFee: 5000,
        feePerKm: 2000,
      },
    };

    it("should create service successfully", async () => {
      // Mock getServiceById method
      vi.spyOn(service, 'getServiceById').mockResolvedValue({
        id: "service-1",
        mitraId: "mitra-1",
        name: "Food Delivery",
        isPublic: true,
        maxRangeKm: 10,
        rate: { id: "rate-1", baseFee: 5000, feePerKm: 2000 },
        supportedVehicleTypes: [],
        supportedPayloadTypes: [],
        availableFacilities: [],
      });

      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ id: "service-1" }]),
        };

        return await callback(mockTx);
      });

      const result = await service.createService("mitra-1", validInput);

      expect(result.id).toBe("service-1");
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("should throw error when service creation fails", async () => {
      // Mock getServiceById to throw NotFoundError
      vi.spyOn(service, 'getServiceById').mockRejectedValue(new Error("Service not found"));

      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ id: "service-1" }]),
        };

        return await callback(mockTx);
      });

      await expect(
        service.createService("mitra-1", validInput)
      ).rejects.toThrow("Service not found");
    });

    it("should rollback transaction when service creation fails", async () => {
      // Mock transaction that fails during service insertion
      const mockTx = {
        insert: vi.fn(),
        delete: vi.fn(),
      };

      // Service insertion fails
      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Service creation failed")),
        }),
      });

      mockDb.transaction = vi.fn().mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await expect(
        service.createService("mitra-1", validInput)
      ).rejects.toThrow("Service creation failed");

      // Verify transaction was called
      expect(mockDb.transaction).toHaveBeenCalled();
      // Verify service insertion was attempted
      expect(mockTx.insert).toHaveBeenCalledWith(expect.anything());
    });

    it("should rollback transaction when vehicle type linking fails", async () => {
      const mockTx = {
        insert: vi.fn(),
        delete: vi.fn(),
      };

      // Service insertion succeeds
      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "service-1" }]),
        }),
      });

      // Rate insertion succeeds  
      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      });

      // Vehicle type linking fails
      mockTx.insert.mockReturnValueOnce({
        values: vi.fn().mockRejectedValue(new Error("Vehicle type linking failed")),
      });

      mockDb.transaction = vi.fn().mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      await expect(
        service.createService("mitra-1", validInput)
      ).rejects.toThrow("Vehicle type linking failed");

      // Verify transaction was called
      expect(mockDb.transaction).toHaveBeenCalled();
      // Verify multiple insertions were attempted before failure
      expect(mockTx.insert).toHaveBeenCalledTimes(3);
    });
  });

  describe("getServices", () => {
    it("should return services for mitra", async () => {
      const mockServices = [
        {
          service: {
            id: "service-1",
            mitraId: "mitra-1",
            name: "Food Delivery",
            isPublic: true,
            maxRangeKm: 10,
          },
          rate: {
            id: "rate-1",
            baseFee: 5000,
            feePerKm: 2000,
          },
        },
      ];

      // Mock the main services query chain
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.leftJoin.mockReturnThis();
      mockDb.where.mockResolvedValueOnce(mockServices);

      // Mock the Promise.all queries for related data (3 queries)
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.innerJoin.mockReturnThis();
      mockDb.where.mockResolvedValueOnce([])  // vehicleTypeLinks
                   .mockResolvedValueOnce([])  // payloadTypeLinks  
                   .mockResolvedValueOnce([]); // facilityLinks

      const result = await service.getServices("mitra-1");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Food Delivery");
    });

    it("should return empty array when no services found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.leftJoin.mockReturnThis();
      mockDb.where.mockResolvedValue([]);

      const result = await service.getServices("mitra-1");

      expect(result).toEqual([]);
    });
  });

  describe("getServiceById", () => {
    it("should return service details", async () => {
      const mockService = {
        service: {
          id: "service-1",
          mitraId: "mitra-1",
          name: "Food Delivery",
          isPublic: true,
          maxRangeKm: 10,
        },
        rate: {
          id: "rate-1",
          baseFee: 5000,
          feePerKm: 2000,
        },
      };

      // Create a fresh mock for this test to avoid query chain conflicts
      const testMockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([mockService]),
      };

      // Create a separate mock for Promise.all queries
      [
        { where: vi.fn().mockResolvedValue([]) }, // vehicleTypeLinks
        { where: vi.fn().mockResolvedValue([]) }, // payloadTypeLinks  
        { where: vi.fn().mockResolvedValue([]) }, // facilityLinks
      ];

      let queryIndex = 0;
      testMockDb.select = vi.fn().mockImplementation(() => {
        if (queryIndex === 0) {
          queryIndex++;
          return testMockDb;
        }
        // Return a fresh query object for Promise.all
        const query = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
        };
        return query;
      });

      const testService = new MitraServiceManagementService(testMockDb as any);
      const result = await testService.getServiceById("mitra-1", "service-1");

      expect(result).toBeTruthy();
      expect(result?.name).toBe("Food Delivery");
    });

    it("should throw error if service not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.leftJoin.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      await expect(
        service.getServiceById("mitra-1", "service-1")
      ).rejects.toThrow("Service not found");
    });
  });

  describe("updateService", () => {
    const updateInput = {
      name: "Updated Food Delivery",
      isPublic: false,
      maxRangeKm: 15,
    };

    it("should update service successfully", async () => {
      // Mock getServiceById method
      vi.spyOn(service, 'getServiceById').mockResolvedValue({
        id: "service-1",
        mitraId: "mitra-1",
        name: "Updated Food Delivery",
        isPublic: false,
        maxRangeKm: 15,
        rate: { id: "rate-1", baseFee: 5000, feePerKm: 2000 },
        supportedVehicleTypes: [],
        supportedPayloadTypes: [],
        availableFacilities: [],
      });

      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
        };

        return await callback(mockTx);
      });

      const result = await service.updateService(
        "mitra-1",
        "service-1",
        updateInput
      );

      expect(result.name).toBe("Updated Food Delivery");
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("should throw error if service not found after update", async () => {
      // Mock getServiceById to throw NotFoundError
      vi.spyOn(service, 'getServiceById').mockRejectedValue(new Error("Service not found"));

      mockDb.transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
        };

        return await callback(mockTx);
      });

      await expect(
        service.updateService("mitra-1", "service-1", updateInput)
      ).rejects.toThrow("Service not found");
    });
  });
});