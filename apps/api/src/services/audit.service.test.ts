import { auditLogs, type DbClient } from "@treksistem/db";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { AuditService, type AuditLogOptions } from "./audit.service";

// Mock database client
const createMockInsertChain = (returnValue: any) => ({
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue(returnValue),
});

const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as unknown as DbClient;

describe("AuditService", () => {
  let service: AuditService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuditService(mockDb);
  });

  describe("log", () => {
    it("should insert audit log entry", async () => {
      const mockInsertChain = createMockInsertChain([{ id: "audit-1" }]);
      (mockDb.insert as any).mockReturnValue(mockInsertChain);

      const auditOptions: AuditLogOptions = {
        actorId: "user-123",
        mitraId: "mitra-123",
        entityType: "ORDER",
        entityId: "order-123",
        eventType: "ORDER_CREATED",
        details: { orderId: "order-123", amount: 50000 },
      };

      await service.log(auditOptions);

      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        adminUserId: "user-123",
        impersonatedMitraId: "mitra-123",
        targetEntity: "order",
        targetId: "order-123",
        action: "ORDER_CREATED",
        payload: { orderId: "order-123", amount: 50000 },
      });
    });

    it("should handle missing mitraId", async () => {
      const mockInsertChain = createMockInsertChain([{ id: "audit-1" }]);
      (mockDb.insert as any).mockReturnValue(mockInsertChain);

      const auditOptions: AuditLogOptions = {
        actorId: "user-123",
        entityType: "USER",
        entityId: "user-123",
        eventType: "USER_LOGIN",
      };

      await service.log(auditOptions);

      expect(mockInsertChain.values).toHaveBeenCalledWith({
        adminUserId: "user-123",
        impersonatedMitraId: null,
        targetEntity: "user",
        targetId: "user-123",
        action: "USER_LOGIN",
        payload: {},
      });
    });

    it("should not throw error when database insert fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (mockDb.insert as any).mockImplementation(() => {
        throw new Error("Database error");
      });

      const auditOptions: AuditLogOptions = {
        actorId: "user-123",
        entityType: "ORDER",
        entityId: "order-123",
        eventType: "ORDER_CREATED",
      };

      // Should not throw
      await expect(service.log(auditOptions)).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith("Audit logging failed:", expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe("withAuditing", () => {
    it("should execute service method and log audit entry on success", async () => {
      const mockInsertChain = createMockInsertChain([{ id: "audit-1" }]);
      (mockDb.insert as any).mockReturnValue(mockInsertChain);

      const mockServiceMethod = vi.fn().mockResolvedValue({ id: "created-123" });
      const auditOptions = {
        actorId: "user-123",
        mitraId: "mitra-123",
        entityType: "ORDER" as const,
        eventType: "ORDER_CREATED" as const,
        entityIdFrom: (result: any) => result.id,
      };

      const auditedMethod = service.withAuditing(auditOptions, mockServiceMethod);
      const result = await auditedMethod("arg1", "arg2");

      expect(mockServiceMethod).toHaveBeenCalledWith("arg1", "arg2");
      expect(result).toEqual({ id: "created-123" });
      expect(mockDb.insert).toHaveBeenCalledWith(auditLogs);
      expect(mockInsertChain.values).toHaveBeenCalledWith({
        adminUserId: "user-123",
        impersonatedMitraId: "mitra-123",
        targetEntity: "order",
        targetId: "created-123",
        action: "ORDER_CREATED",
        payload: {},
      });
    });

    it("should use default entityId when entityIdFrom not provided", async () => {
      const mockInsertChain = createMockInsertChain([{ id: "audit-1" }]);
      (mockDb.insert as any).mockReturnValue(mockInsertChain);

      const mockServiceMethod = vi.fn().mockResolvedValue({ id: "created-123" });
      const auditOptions = {
        actorId: "user-123",
        entityType: "ORDER" as const,
        eventType: "ORDER_UPDATED" as const,
      };

      const auditedMethod = service.withAuditing(auditOptions, mockServiceMethod);
      await auditedMethod("arg1");

      expect(mockInsertChain.values).toHaveBeenCalledWith({
        adminUserId: "user-123",
        impersonatedMitraId: null,
        targetEntity: "order",
        targetId: "COMPLETED",
        action: "ORDER_UPDATED",
        payload: {},
      });
    });

    it("should not log audit entry when service method fails", async () => {
      const mockServiceMethod = vi.fn().mockRejectedValue(new Error("Service error"));
      const auditOptions = {
        actorId: "user-123",
        entityType: "ORDER" as const,
        eventType: "ORDER_CREATED" as const,
      };

      const auditedMethod = service.withAuditing(auditOptions, mockServiceMethod);

      await expect(auditedMethod("arg1")).rejects.toThrow("Service error");
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("should handle audit logging failure gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockServiceMethod = vi.fn().mockResolvedValue({ id: "created-123" });
      
      // Make audit logging fail
      (mockDb.insert as any).mockImplementation(() => {
        throw new Error("Audit error");
      });

      const auditOptions = {
        actorId: "user-123",
        entityType: "ORDER" as const,
        eventType: "ORDER_CREATED" as const,
        entityIdFrom: (result: any) => result.id,
      };

      const auditedMethod = service.withAuditing(auditOptions, mockServiceMethod);
      const result = await auditedMethod("arg1");

      expect(result).toEqual({ id: "created-123" });
      expect(consoleSpy).toHaveBeenCalledWith("Audit logging failed:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    it("should preserve original method arguments", async () => {
      const mockInsertChain = createMockInsertChain([{ id: "audit-1" }]);
      (mockDb.insert as any).mockReturnValue(mockInsertChain);

      const mockServiceMethod = vi.fn().mockImplementation((a: string, b: number, c: boolean) => {
        return Promise.resolve({ args: [a, b, c] });
      });

      const auditOptions = {
        actorId: "user-123",
        entityType: "ORDER" as const,
        eventType: "ORDER_CREATED" as const,
      };

      const auditedMethod = service.withAuditing(auditOptions, mockServiceMethod);
      const result = await auditedMethod("test", 42, true);

      expect(mockServiceMethod).toHaveBeenCalledWith("test", 42, true);
      expect(result.args).toEqual(["test", 42, true]);
    });
  });
});