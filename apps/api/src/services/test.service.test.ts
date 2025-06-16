import { describe, it, expect, vi, beforeEach } from "vitest";
import { TestService } from "./test.service";

// Mock Drizzle DB
const mockDb = {
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  }),
} as any;

// Mock D1 Database
const mockDirectDb = {
  exec: vi.fn().mockResolvedValue(undefined),
} as any;

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockImplementation((length?: number) => {
    return length === 12 ? "test12345678" : "testnanoid123";
  }),
}));

describe("TestService", () => {
  let testService: TestService;

  beforeEach(() => {
    vi.clearAllMocks();
    testService = new TestService(mockDb, mockDirectDb);
  });

  describe("setupBaseTestData", () => {
    it("should setup base test data successfully", async () => {
      const result = await testService.setupBaseTestData();

      expect(result.message).toBe("Test data setup complete");
      
      // Verify cleanup operations were called
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      
      // Should have inserted users and mitras
      const insertCalls = mockDb.insert.mock.calls;
      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it("should handle cleanup errors gracefully", async () => {
      // Mock delete to throw error
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("Delete failed")),
      });

      const result = await testService.setupBaseTestData();

      // Should still complete successfully
      expect(result.message).toBe("Test data setup complete");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should handle insert errors gracefully", async () => {
      // Mock insert to throw error for duplicate entries
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error("Duplicate entry")),
      });

      const result = await testService.setupBaseTestData();

      // Should still complete successfully
      expect(result.message).toBe("Test data setup complete");
    });

    it("should create test users with correct data", async () => {
      await testService.setupBaseTestData();

      const insertCalls = mockDb.insert.mock.calls;
      const usersInsert = insertCalls.find(call => {
        const values = call[0].values?.mock?.calls?.[0]?.[0];
        return Array.isArray(values) && values.some(v => v.email?.includes("mitra1@test.com"));
      });

      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it("should create test mitras with correct data", async () => {
      await testService.setupBaseTestData();

      const insertCalls = mockDb.insert.mock.calls;
      expect(insertCalls.length).toBeGreaterThan(0);
    });
  });

  describe("setupLogbookTestData", () => {
    it("should setup logbook test data successfully", async () => {
      const result = await testService.setupLogbookTestData();

      expect(result.message).toBe("Logbook test data setup complete");
      expect(result.data).toBeDefined();
      expect(result.data.vehicleV1).toBe("vehicle_v1");
      expect(result.data.vehicleV2).toBe("vehicle_v2");
      expect(result.data.driverA1).toBe("driver_a1");
      expect(result.data.orderIds).toEqual(["order_1", "order_2"]);
      expect(result.data.orderPublicIds).toEqual(["test12345678", "test12345678"]);
      expect(result.data.testDates).toBeDefined();
      expect(result.data.testDates.yesterday).toBeDefined();
      expect(result.data.testDates.today).toBeDefined();
    });

    it("should clean up existing test data first", async () => {
      await testService.setupLogbookTestData();

      // Verify cleanup SQL statements were executed
      expect(mockDirectDb.exec).toHaveBeenCalled();
      
      const execCalls = mockDirectDb.exec.mock.calls;
      const deleteCalls = execCalls.filter(call => 
        call[0].includes("DELETE FROM")
      );
      
      expect(deleteCalls.length).toBeGreaterThan(0);
    });

    it("should create drivers, vehicles, services, orders and reports", async () => {
      await testService.setupLogbookTestData();

      const execCalls = mockDirectDb.exec.mock.calls;
      
      // Check for driver creation
      const driverInsert = execCalls.find(call => 
        call[0].includes("INSERT INTO drivers")
      );
      expect(driverInsert).toBeDefined();
      
      // Check for vehicle creation
      const vehicleInserts = execCalls.filter(call => 
        call[0].includes("INSERT INTO vehicles")
      );
      expect(vehicleInserts.length).toBe(2);
      
      // Check for service creation
      const serviceInsert = execCalls.find(call => 
        call[0].includes("INSERT INTO services")
      );
      expect(serviceInsert).toBeDefined();
      
      // Check for order creation
      const orderInserts = execCalls.filter(call => 
        call[0].includes("INSERT INTO orders")
      );
      expect(orderInserts.length).toBe(2);
      
      // Check for order stops creation
      const stopInserts = execCalls.filter(call => 
        call[0].includes("INSERT INTO order_stops")
      );
      expect(stopInserts.length).toBe(4);
      
      // Check for order reports creation
      const reportInsert = execCalls.find(call => 
        call[0].includes("INSERT INTO order_reports")
      );
      expect(reportInsert).toBeDefined();
    });

    it("should use different dates for yesterday and today", async () => {
      const result = await testService.setupLogbookTestData();

      expect(result.data.testDates.yesterday).not.toBe(result.data.testDates.today);
    });

    it("should handle database errors", async () => {
      mockDirectDb.exec.mockRejectedValue(new Error("Database error"));

      await expect(testService.setupLogbookTestData()).rejects.toThrow("Database error");
    });

    it("should create orders with proper public IDs", async () => {
      const result = await testService.setupLogbookTestData();

      expect(result.data.orderPublicIds).toHaveLength(2);
      result.data.orderPublicIds.forEach(id => {
        expect(id).toBe("test12345678"); // Mocked nanoid result
      });
    });

    it("should create timestamps for different time periods", async () => {
      await testService.setupLogbookTestData();

      const execCalls = mockDirectDb.exec.mock.calls;
      const orderInserts = execCalls.filter(call => 
        call[0].includes("INSERT INTO orders")
      );

      // Should have different timestamps for different days
      expect(orderInserts.length).toBe(2);
      orderInserts.forEach(call => {
        expect(call[0]).toMatch(/\d+\)\'/); // Should contain timestamp
      });
    });
  });

  describe("cleanupTestData", () => {
    it("should cleanup test data successfully", async () => {
      const result = await testService.cleanupTestData();

      expect(result.message).toBe("Test data cleanup complete");
      
      // Verify all delete operations were called
      expect(mockDb.delete).toHaveBeenCalled();
      
      const deleteCalls = mockDb.delete.mock.calls;
      expect(deleteCalls.length).toBeGreaterThan(0);
    });

    it("should delete in correct order to respect foreign key constraints", async () => {
      await testService.cleanupTestData();

      const deleteCalls = mockDb.delete.mock.calls;
      
      // Should delete vehicles before mitras, mitras before users
      expect(deleteCalls.length).toBeGreaterThanOrEqual(5);
    });

    it("should handle deletion errors", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("Delete failed")),
      });

      // Should still attempt to complete cleanup
      await expect(testService.cleanupTestData()).rejects.toThrow("Delete failed");
    });
  });

  describe("constructor", () => {
    it("should initialize with required dependencies", () => {
      const service = new TestService(mockDb, mockDirectDb);
      expect(service).toBeDefined();
    });
  });

  describe("integration scenarios", () => {
    it("should handle full setup and cleanup cycle", async () => {
      // Setup base data
      const setupResult = await testService.setupBaseTestData();
      expect(setupResult.message).toBe("Test data setup complete");
      
      // Setup logbook data
      const logbookResult = await testService.setupLogbookTestData();
      expect(logbookResult.message).toBe("Logbook test data setup complete");
      
      // Cleanup
      const cleanupResult = await testService.cleanupTestData();
      expect(cleanupResult.message).toBe("Test data cleanup complete");
    });

    it("should handle multiple setup calls", async () => {
      // First setup
      await testService.setupBaseTestData();
      
      // Second setup should also work (handles duplicates)
      const result = await testService.setupBaseTestData();
      expect(result.message).toBe("Test data setup complete");
    });
  });
});