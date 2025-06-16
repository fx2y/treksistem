import { describe, it, expect, beforeEach, vi } from "vitest";

import { MasterDataService } from "./master-data.service";

describe("MasterDataService", () => {
  let masterDataService: MasterDataService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
    };
    masterDataService = new MasterDataService(mockDb);
  });

  describe("getMasterData", () => {
    it("should return master data with all categories", async () => {
      const mockVehicleTypes = [
        { id: "vehicle_1", name: "Motorcycle", icon: "🏍️" },
        { id: "vehicle_2", name: "Car", icon: "🚗" },
      ];

      const mockPayloadTypes = [
        { id: "payload_1", name: "Small Package", icon: "📦" },
        { id: "payload_2", name: "Large Package", icon: "📫" },
      ];

      const mockFacilities = [
        { id: "facility_1", name: "GPS Tracking", icon: "📍" },
        { id: "facility_2", name: "Cold Storage", icon: "❄️" },
      ];

      let callCount = 0;
      mockDb.select.mockReturnValue({
        from: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.resolve(mockVehicleTypes);
          if (callCount === 2) return Promise.resolve(mockPayloadTypes);
          if (callCount === 3) return Promise.resolve(mockFacilities);
          return Promise.resolve([]);
        }),
      });

      const result = await masterDataService.getMasterData();

      expect(result).toEqual({
        vehicles: [
          { id: "vehicle_1", name: "Motorcycle", icon: "🏍️" },
          { id: "vehicle_2", name: "Car", icon: "🚗" },
        ],
        payloads: [
          { id: "payload_1", name: "Small Package", icon: "📦" },
          { id: "payload_2", name: "Large Package", icon: "📫" },
        ],
        facilities: [
          { id: "facility_1", name: "GPS Tracking", icon: "📍" },
          { id: "facility_2", name: "Cold Storage", icon: "❄️" },
        ],
      });
    });

    it("should handle empty master data", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      });

      const result = await masterDataService.getMasterData();

      expect(result).toEqual({
        vehicles: [],
        payloads: [],
        facilities: [],
      });
    });

    it("should handle null icons", async () => {
      const mockVehicleTypes = [
        { id: "vehicle_1", name: "Motorcycle", icon: null },
      ];

      mockDb.select.mockReturnValue({
        from: vi
          .fn()
          .mockResolvedValueOnce(mockVehicleTypes)
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      });

      const result = await masterDataService.getMasterData();

      expect(result.vehicles[0]).toEqual({
        id: "vehicle_1",
        name: "Motorcycle",
        icon: null,
      });
    });

    it("should call database with correct tables", async () => {
      const mockChain = {
        from: vi.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockChain);

      await masterDataService.getMasterData();

      expect(mockDb.select).toHaveBeenCalledTimes(3);
      expect(mockChain.from).toHaveBeenCalledTimes(3);
    });
  });
});
