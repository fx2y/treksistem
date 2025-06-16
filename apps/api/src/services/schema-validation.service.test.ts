import { describe, it, expect, vi, beforeEach } from "vitest";
import { SchemaValidationService } from "./schema-validation.service";
import { BadRequestError } from "../lib/errors";

// Mock KV namespace
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
} as any;

// Mock database with different behaviors
const mockDbWithAll = {
  all: vi.fn(),
} as any;

const mockDbWithoutAll = {} as any;

// Mock console methods
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

describe("SchemaValidationService", () => {
  let schemaValidationService: SchemaValidationService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with database that supports .all() method", () => {
    beforeEach(() => {
      schemaValidationService = new SchemaValidationService({
        db: mockDbWithAll,
        alertingKV: mockKV,
      });
    });

    it("should validate schema successfully when all tables exist", async () => {
      // Mock database returning all expected tables
      const expectedTables = [
        "users", "refresh_tokens", "oauth_sessions", "mitras", "drivers",
        "driver_invites", "vehicles", "master_vehicle_types", "master_payload_types",
        "master_facilities", "services", "services_to_vehicle_types",
        "services_to_payload_types", "services_to_facilities", "service_rates",
        "orders", "order_stops", "order_reports", "notification_templates",
        "notification_logs", "driver_locations", "audit_logs", "invoices"
      ];

      mockDbWithAll.all.mockResolvedValue(
        expectedTables.map(name => ({ name }))
      );

      const result = await schemaValidationService.validateSchema();

      expect(result.isValid).toBe(true);
      expect(result.missingTables).toBeUndefined();
      expect(result.extraTables).toBeUndefined();
      expect(result.errors).toBeUndefined();
    });

    it("should detect missing tables", async () => {
      // Mock database missing some tables
      mockDbWithAll.all.mockResolvedValue([
        { name: "users" },
        { name: "mitras" },
        // Missing other tables
      ]);

      const result = await schemaValidationService.validateSchema();

      expect(result.isValid).toBe(false);
      expect(result.missingTables).toBeDefined();
      expect(result.missingTables?.length).toBeGreaterThan(0);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain("Missing critical tables");
    });

    it("should detect extra tables", async () => {
      // Mock database with extra tables
      const allTables = [
        "users", "refresh_tokens", "oauth_sessions", "mitras", "drivers",
        "driver_invites", "vehicles", "master_vehicle_types", "master_payload_types",
        "master_facilities", "services", "services_to_vehicle_types",
        "services_to_payload_types", "services_to_facilities", "service_rates",
        "orders", "order_stops", "order_reports", "notification_templates",
        "notification_logs", "driver_locations", "audit_logs", "invoices",
        "extra_table1", "extra_table2" // Extra tables
      ];

      mockDbWithAll.all.mockResolvedValue(
        allTables.map(name => ({ name }))
      );

      const result = await schemaValidationService.validateSchema();

      expect(result.isValid).toBe(true); // Extra tables don't make it invalid
      expect(result.extraTables).toEqual(["extra_table1", "extra_table2"]);
    });

    it("should handle database errors gracefully", async () => {
      mockDbWithAll.all.mockRejectedValue(new Error("Database connection failed"));

      const result = await schemaValidationService.validateSchema();

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain("Schema validation failed");
    });

    it("should validate table structure successfully", async () => {
      mockDbWithAll.all.mockResolvedValue([
        { cid: 0, name: "id", type: "TEXT", notnull: 1, dflt_value: null, pk: 1 },
        { cid: 1, name: "name", type: "TEXT", notnull: 1, dflt_value: null, pk: 0 },
      ]);

      const result = await schemaValidationService.validateTableStructure("users");

      expect(result).toBe(true);
      expect(mockDbWithAll.all).toHaveBeenCalledWith("PRAGMA table_info(users)");
    });

    it("should handle table structure validation errors", async () => {
      mockDbWithAll.all.mockRejectedValue(new Error("Table not found"));

      const result = await schemaValidationService.validateTableStructure("nonexistent");

      expect(result).toBe(false);
    });

    it("should check foreign key constraints successfully", async () => {
      // Mock foreign keys enabled
      mockDbWithAll.all.mockResolvedValueOnce([{ foreign_keys: 1 }]);
      // Mock no FK violations
      mockDbWithAll.all.mockResolvedValueOnce([]);

      const result = await schemaValidationService.checkForeignKeyConstraints();

      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should detect foreign key constraint violations", async () => {
      // Mock foreign keys enabled
      mockDbWithAll.all.mockResolvedValueOnce([{ foreign_keys: 1 }]);
      // Mock FK violations
      mockDbWithAll.all.mockResolvedValueOnce([
        { table: "orders", rowid: 1, parent: "services", fkid: 0 },
      ]);

      const result = await schemaValidationService.checkForeignKeyConstraints();

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain("Foreign key violation");
    });

    it("should detect disabled foreign keys", async () => {
      // Mock foreign keys disabled
      mockDbWithAll.all.mockResolvedValueOnce([{ foreign_keys: 0 }]);

      const result = await schemaValidationService.checkForeignKeyConstraints();

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain("Foreign key constraints are not enabled");
    });
  });

  describe("with database without .all() method (test environment)", () => {
    beforeEach(() => {
      schemaValidationService = new SchemaValidationService({
        db: mockDbWithoutAll,
        alertingKV: mockKV,
      });
    });

    it("should assume valid schema in test environment", async () => {
      const result = await schemaValidationService.validateSchema();

      expect(result.isValid).toBe(true);
      expect(result.missingTables).toBeUndefined();
    });

    it("should return true for table structure validation", async () => {
      const result = await schemaValidationService.validateTableStructure("users");

      expect(result).toBe(true);
    });

    it("should skip foreign key checks", async () => {
      const result = await schemaValidationService.checkForeignKeyConstraints();

      expect(result.isValid).toBe(true);
    });
  });

  describe("runFullValidation", () => {
    beforeEach(() => {
      schemaValidationService = new SchemaValidationService({
        db: mockDbWithAll,
        alertingKV: mockKV,
      });
    });

    it("should combine schema and FK validation results", async () => {
      // Mock successful schema validation
      mockDbWithAll.all
        .mockResolvedValueOnce([]) // Empty table list
        .mockResolvedValueOnce([{ foreign_keys: 1 }]) // FK enabled
        .mockResolvedValueOnce([]); // No FK violations

      const result = await schemaValidationService.runFullValidation();

      expect(result.isValid).toBe(false); // Should be false due to missing tables
      expect(result.errors).toBeDefined();
    });
  });

  describe("ensureSchemaValid", () => {
    beforeEach(() => {
      schemaValidationService = new SchemaValidationService({
        db: mockDbWithoutAll, // Use test environment for simplicity
        alertingKV: mockKV,
      });
    });

    it("should pass when schema is valid", async () => {
      mockKV.get.mockResolvedValue(null); // No previous metrics

      await expect(
        schemaValidationService.ensureSchemaValid()
      ).resolves.not.toThrow();

      expect(mockKV.put).toHaveBeenCalled(); // Should update metrics
    });

    it("should throw error when schema is invalid", async () => {
      // Use mockDbWithAll to simulate failures
      schemaValidationService = new SchemaValidationService({
        db: mockDbWithAll,
        alertingKV: mockKV,
      });

      mockDbWithAll.all.mockResolvedValue([]); // Empty table list
      mockKV.get.mockResolvedValue(null);
      mockKV.put.mockResolvedValue(undefined);

      await expect(
        schemaValidationService.ensureSchemaValid()
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe("alerting and monitoring", () => {
    beforeEach(() => {
      schemaValidationService = new SchemaValidationService({
        db: mockDbWithAll,
        alertingKV: mockKV,
      });
    });

    it("should track consecutive failures", async () => {
      mockDbWithAll.all.mockResolvedValue([]); // Empty table list causes failure
      mockKV.get.mockResolvedValue(null); // No previous metrics
      mockKV.put.mockResolvedValue(undefined);

      try {
        await schemaValidationService.ensureSchemaValid();
      } catch (e) {
        // Expected to throw
      }

      expect(mockKV.put).toHaveBeenCalled();
      const putCall = mockKV.put.mock.calls[0];
      const metrics = JSON.parse(putCall[1]);
      expect(metrics.consecutiveFailures).toBe(1);
      expect(metrics.totalFailures).toBe(1);
    });

    it("should send alert after threshold failures", async () => {
      mockDbWithAll.all.mockResolvedValue([]); // Empty table list causes failure
      
      // Mock existing metrics with consecutive failures near threshold
      mockKV.get.mockResolvedValue(JSON.stringify({
        consecutiveFailures: 2, // One less than threshold
        totalFailures: 5,
      }));
      mockKV.put.mockResolvedValue(undefined);

      try {
        await schemaValidationService.ensureSchemaValid();
      } catch (e) {
        // Expected to throw
      }

      // Should log alert
      expect(console.error).toHaveBeenCalledWith(
        "🚨 SCHEMA VALIDATION ALERT:",
        expect.any(Object)
      );
    });

    it("should reset consecutive failures on success", async () => {
      // Mock previous failures
      mockKV.get.mockResolvedValue(JSON.stringify({
        consecutiveFailures: 2,
        totalFailures: 5,
      }));
      mockKV.put.mockResolvedValue(undefined);

      // Use test environment for success
      schemaValidationService = new SchemaValidationService({
        db: mockDbWithoutAll,
        alertingKV: mockKV,
      });

      await schemaValidationService.ensureSchemaValid();

      expect(mockKV.put).toHaveBeenCalled();
      const putCall = mockKV.put.mock.calls[0];
      const metrics = JSON.parse(putCall[1]);
      expect(metrics.consecutiveFailures).toBe(0);
    });

    it("should provide monitoring metrics", async () => {
      mockKV.get.mockResolvedValue(JSON.stringify({
        consecutiveFailures: 0,
        totalFailures: 3,
      }));

      // Use test environment for healthy state
      schemaValidationService = new SchemaValidationService({
        db: mockDbWithoutAll,
        alertingKV: mockKV,
      });

      const result = await schemaValidationService.getMonitoringMetrics();

      expect(result.isHealthy).toBe(true);
      expect(result.metrics.consecutiveFailures).toBe(0);
      expect(result.metrics.totalFailures).toBe(3);
      expect(result.lastValidationResult).toBeDefined();
    });
  });

  describe("without alerting KV", () => {
    beforeEach(() => {
      schemaValidationService = new SchemaValidationService({
        db: mockDbWithoutAll,
        // No alertingKV provided
      });
    });

    it("should work without alerting KV", async () => {
      await expect(
        schemaValidationService.ensureSchemaValid()
      ).resolves.not.toThrow();
    });

    it("should return default metrics without KV", async () => {
      const result = await schemaValidationService.getMonitoringMetrics();

      expect(result.metrics.consecutiveFailures).toBe(0);
      expect(result.metrics.totalFailures).toBe(0);
    });
  });
});