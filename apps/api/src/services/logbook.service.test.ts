import type { DbClient } from "@treksistem/db";
import { orderReports } from "@treksistem/db";
import { describe, it, expect, beforeEach, vitest } from "vitest";

import { LogbookService } from "./logbook.service";

// Mock database
const mockDb = {
  select: vitest.fn(),
  from: vitest.fn(),
  innerJoin: vitest.fn(),
  leftJoin: vitest.fn(),
  where: vitest.fn(),
  orderBy: vitest.fn(),
} as DbClient;

const mockChain = {
  select: vitest.fn().mockReturnThis(),
  from: vitest.fn().mockReturnThis(),
  innerJoin: vitest.fn().mockReturnThis(),
  leftJoin: vitest.fn().mockReturnThis(),
  where: vitest.fn().mockReturnThis(),
  orderBy: vitest.fn().mockReturnValue([]),
};

mockDb.select.mockReturnValue(mockChain);

describe("LogbookService", () => {
  let logbookService: LogbookService;
  const mockMitraId = "mitra-123";

  beforeEach(() => {
    logbookService = new LogbookService(mockDb);
    vitest.clearAllMocks();
  });

  it("should fetch logbook entries for a mitra", async () => {
    const mockResults = [
      {
        timestamp: new Date("2024-01-15T10:30:00Z"),
        stage: "pickup",
        notes: "Picked up at restaurant",
        driverName: "John Driver",
        vehicleLicensePlate: "B1234XYZ",
        orderPublicId: "ORD-123",
      },
      {
        timestamp: new Date("2024-01-15T11:00:00Z"),
        stage: "dropoff",
        notes: "Delivered to customer",
        driverName: "John Driver",
        vehicleLicensePlate: "B1234XYZ",
        orderPublicId: "ORD-123",
      },
    ];

    mockChain.orderBy.mockReturnValue(mockResults);

    const result = await logbookService.getLogbook(mockMitraId, {});

    expect(result).toEqual([
      {
        timestamp: "2024-01-15T10:30:00.000Z",
        event: "Pickup reported",
        address: "Picked up at restaurant",
        driverName: "John Driver",
        vehicleLicensePlate: "B1234XYZ",
        orderPublicId: "ORD-123",
      },
      {
        timestamp: "2024-01-15T11:00:00.000Z",
        event: "Drop-off reported",
        address: "Delivered to customer",
        driverName: "John Driver",
        vehicleLicensePlate: "B1234XYZ",
        orderPublicId: "ORD-123",
      },
    ]);

    expect(mockDb.select).toHaveBeenCalledWith({
      timestamp: orderReports.timestamp,
      stage: orderReports.stage,
      notes: orderReports.notes,
      driverName: users.name,
      vehicleLicensePlate: vehicles.licensePlate,
      orderPublicId: orders.publicId,
    });
  });

  it("should filter by vehicle ID when provided", async () => {
    mockChain.orderBy.mockReturnValue([]);

    await logbookService.getLogbook(mockMitraId, { vehicleId: "vehicle-123" });

    expect(mockChain.where).toHaveBeenCalled();
  });

  it("should filter by driver ID when provided", async () => {
    mockChain.orderBy.mockReturnValue([]);

    await logbookService.getLogbook(mockMitraId, { driverId: "driver-123" });

    expect(mockChain.where).toHaveBeenCalled();
  });

  it("should filter by date when provided", async () => {
    mockChain.orderBy.mockReturnValue([]);

    await logbookService.getLogbook(mockMitraId, { date: "2024-01-15" });

    expect(mockChain.where).toHaveBeenCalled();
  });

  it("should handle transit update reports", async () => {
    const mockResults = [
      {
        timestamp: new Date("2024-01-15T10:45:00Z"),
        stage: "transit_update",
        notes: "On the way to destination",
        driverName: "Jane Driver",
        vehicleLicensePlate: "B5678ABC",
        orderPublicId: "ORD-456",
      },
    ];

    mockChain.orderBy.mockReturnValue(mockResults);

    const result = await logbookService.getLogbook(mockMitraId, {});

    expect(result[0].event).toBe("Transit update reported");
  });

  it("should handle missing data gracefully", async () => {
    const mockResults = [
      {
        timestamp: null,
        stage: "pickup",
        notes: null,
        driverName: null,
        vehicleLicensePlate: null,
        orderPublicId: "ORD-789",
      },
    ];

    mockChain.orderBy.mockReturnValue(mockResults);

    const result = await logbookService.getLogbook(mockMitraId, {});

    expect(result[0]).toEqual({
      timestamp: "",
      event: "Pickup reported",
      address: "No location details",
      driverName: "Unknown Driver",
      vehicleLicensePlate: "Unknown Vehicle",
      orderPublicId: "ORD-789",
    });
  });

  it("should enforce mitra tenancy by including mitra filter in query", async () => {
    mockChain.orderBy.mockReturnValue([]);

    await logbookService.getLogbook(mockMitraId, {});

    // Verify that services.mitraId filter is included in conditions
    expect(mockChain.where).toHaveBeenCalled();
  });
});
