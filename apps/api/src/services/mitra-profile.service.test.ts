import { describe, it, expect, beforeEach, vi } from "vitest";
import { MitraProfileService } from "./mitra-profile.service";
import { AuditService } from "./audit.service";

describe("MitraProfileService", () => {
  let mitraProfileService: MitraProfileService;
  let mockDb: any;
  let mockAuditService: AuditService;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn(),
    };

    mockAuditService = {
      log: vi.fn(),
    } as any;

    mitraProfileService = new MitraProfileService(mockDb, mockAuditService);
  });

  describe("getProfile", () => {
    it("should return mitra profile when found", async () => {
      const mockMitra = {
        id: "mitra_123",
        businessName: "Test Business",
        address: "123 Test St",
        phone: "081234567890",
        hasCompletedOnboarding: true,
      };

      mockDb.limit.mockResolvedValue([mockMitra]);

      const result = await mitraProfileService.getProfile("mitra_123");

      expect(result).toEqual({
        id: "mitra_123",
        businessName: "Test Business",
        address: "123 Test St",
        phone: "081234567890",
        hasCompletedOnboarding: true,
      });

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it("should return null when mitra not found", async () => {
      mockDb.limit.mockResolvedValue([]);

      const result = await mitraProfileService.getProfile("nonexistent");

      expect(result).toBeNull();
    });

    it("should handle mitra with null optional fields", async () => {
      const mockMitra = {
        id: "mitra_123",
        businessName: "Test Business",
        address: null,
        phone: null,
        hasCompletedOnboarding: false,
      };

      mockDb.limit.mockResolvedValue([mockMitra]);

      const result = await mitraProfileService.getProfile("mitra_123");

      expect(result).toEqual({
        id: "mitra_123",
        businessName: "Test Business",
        address: null,
        phone: null,
        hasCompletedOnboarding: false,
      });
    });
  });

  describe("updateProfile", () => {
    it("should update profile with all fields and create audit log", async () => {
      const updateData = {
        businessName: "Updated Business",
        address: "456 New St",
        phone: "089876543210",
      };

      const mockUpdatedProfile = {
        id: "mitra_123",
        businessName: "Updated Business",
        address: "456 New St",
        phone: "089876543210",
        hasCompletedOnboarding: true,
      };

      mockDb.set.mockReturnThis();
      vi.spyOn(mitraProfileService, "getProfile").mockResolvedValue(mockUpdatedProfile);

      const result = await mitraProfileService.updateProfile("mitra_123", updateData);

      expect(result).toEqual(mockUpdatedProfile);
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockDb.set).toHaveBeenCalledWith({
        businessName: "Updated Business",
        address: "456 New St",
        phone: "089876543210",
      });

      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: "mitra_123",
        mitraId: "mitra_123",
        entityType: "MITRA",
        entityId: "mitra_123",
        eventType: "MITRA_PROFILE_UPDATED",
        details: {
          action: "PROFILE_UPDATED",
          changes: updateData,
        },
      });
    });

    it("should update profile with only required fields", async () => {
      const updateData = {
        businessName: "Updated Business",
      };

      const mockUpdatedProfile = {
        id: "mitra_123",
        businessName: "Updated Business",
        address: "123 Test St",
        phone: "081234567890",
        hasCompletedOnboarding: true,
      };

      mockDb.set.mockReturnThis();
      vi.spyOn(mitraProfileService, "getProfile").mockResolvedValue(mockUpdatedProfile);

      const result = await mitraProfileService.updateProfile("mitra_123", updateData);

      expect(result).toEqual(mockUpdatedProfile);
      expect(mockDb.set).toHaveBeenCalledWith({
        businessName: "Updated Business",
      });
    });

    it("should work without audit service", async () => {
      const serviceWithoutAudit = new MitraProfileService(mockDb);
      const updateData = {
        businessName: "Updated Business",
      };

      const mockUpdatedProfile = {
        id: "mitra_123",
        businessName: "Updated Business",
        address: null,
        phone: null,
        hasCompletedOnboarding: false,
      };

      mockDb.set.mockReturnThis();
      vi.spyOn(serviceWithoutAudit, "getProfile").mockResolvedValue(mockUpdatedProfile);

      const result = await serviceWithoutAudit.updateProfile("mitra_123", updateData);

      expect(result).toEqual(mockUpdatedProfile);
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });

  describe("completeOnboarding", () => {
    it("should complete onboarding and create audit log", async () => {
      const mockUpdatedProfile = {
        id: "mitra_123",
        businessName: "Test Business",
        address: "123 Test St",
        phone: "081234567890",
        hasCompletedOnboarding: true,
      };

      mockDb.set.mockReturnThis();
      vi.spyOn(mitraProfileService, "getProfile").mockResolvedValue(mockUpdatedProfile);

      const result = await mitraProfileService.completeOnboarding("mitra_123");

      expect(result).toEqual(mockUpdatedProfile);
      expect(mockDb.update).toHaveBeenCalledTimes(1);
      expect(mockDb.set).toHaveBeenCalledWith({
        hasCompletedOnboarding: true,
      });

      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: "mitra_123",
        mitraId: "mitra_123",
        entityType: "MITRA",
        entityId: "mitra_123",
        eventType: "MITRA_ONBOARDING_COMPLETED",
        details: {
          action: "ONBOARDING_COMPLETED",
        },
      });
    });

    it("should work without audit service", async () => {
      const serviceWithoutAudit = new MitraProfileService(mockDb);
      const mockUpdatedProfile = {
        id: "mitra_123",
        businessName: "Test Business",
        address: null,
        phone: null,
        hasCompletedOnboarding: true,
      };

      mockDb.set.mockReturnThis();
      vi.spyOn(serviceWithoutAudit, "getProfile").mockResolvedValue(mockUpdatedProfile);

      const result = await serviceWithoutAudit.completeOnboarding("mitra_123");

      expect(result).toEqual(mockUpdatedProfile);
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });
});