import {
  driverInvites,
  drivers,
  users,
  mitras,
} from "@treksistem/db";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { DriverManagementService } from "./driver-management.service";

// Create a comprehensive mock for the database client
const createMockSelectChain = (returnValue: any) => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(returnValue),
  length: Array.isArray(returnValue) ? returnValue.length : 0,
});

const createMockInsertChain = (returnValue: any) => ({
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue(returnValue),
});

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  query: {
    drivers: {
      findMany: vi.fn(),
    },
  },
};

const mockMitra = {
  id: "mitra-1",
  userId: "user-1",
  businessName: "Test Mitra",
  subscriptionStatus: "active",
  activeDriverLimit: 5,
};

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  googleId: "google-123",
};

describe("DriverManagementService", () => {
  let service: DriverManagementService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DriverManagementService(mockDb as any);
  });

  describe("inviteDriver", () => {
    it("should successfully create and persist driver invitation", async () => {
      // Mock mitra lookup
      mockDb.select.mockReturnValueOnce(createMockSelectChain(mockMitra));
      
      // Mock current driver count check - return empty array
      const driversCountChain = createMockSelectChain([]);
      driversCountChain.length = 0; // Explicitly set length property
      mockDb.select.mockReturnValueOnce(driversCountChain);
      
      // Mock existing driver check
      mockDb.select.mockReturnValueOnce(createMockSelectChain(null));
      
      // Mock existing invite check
      mockDb.select.mockReturnValueOnce(createMockSelectChain(null));

      // Mock successful insert with returning
      mockDb.insert.mockReturnValue(createMockInsertChain([{ id: "invite-123" }]));

      const result = await service.inviteDriver("mitra-1", "newdriver@example.com");

      // Verify the insert was called
      expect(mockDb.insert).toHaveBeenCalledWith(driverInvites);

      // Verify the result
      expect(result).toEqual({
        inviteLink: expect.stringContaining("https://treksistem.app/join?token="),
      });
    });

    it("should throw error when database insert fails (persistence issue)", async () => {
      // Mock mitra lookup
      mockDb.select.mockReturnValueOnce(createMockSelectChain(mockMitra));
      
      // Mock current driver count check - return empty array
      const driversCountChain = createMockSelectChain([]);
      driversCountChain.length = 0;
      mockDb.select.mockReturnValueOnce(driversCountChain);
      
      // Mock existing driver check
      mockDb.select.mockReturnValueOnce(createMockSelectChain(null));
      
      // Mock existing invite check
      mockDb.select.mockReturnValueOnce(createMockSelectChain(null));

      // Mock failed insert - returning empty array (simulates persistence failure)
      mockDb.insert.mockReturnValue(createMockInsertChain([]));

      await expect(
        service.inviteDriver("mitra-1", "newdriver@example.com")
      ).rejects.toThrow("Failed to create driver invitation - database insert failed");
    });

    it("should reject invitation when mitra not found", async () => {
      mockDb.select.mockReturnValueOnce(createMockSelectChain(null));

      await expect(
        service.inviteDriver("nonexistent-mitra", "test@example.com")
      ).rejects.toThrow("Mitra not found");
    });

    it("should reject invitation when subscription is past due", async () => {
      const pastDueMitra = { ...mockMitra, subscriptionStatus: "past_due" };
      mockDb.select.mockReturnValueOnce(createMockSelectChain(pastDueMitra));

      await expect(
        service.inviteDriver("mitra-1", "test@example.com")
      ).rejects.toThrow("Your subscription is not active");
    });

    it("should reject invitation when driver limit reached", async () => {
      const limitedMitra = { ...mockMitra, activeDriverLimit: 1 };
      
      mockDb.select.mockReturnValueOnce(createMockSelectChain(limitedMitra));
      
      // Mock driver count to return 2 drivers (exceeds limit of 1)
      const driversCountChain = createMockSelectChain([{}, {}]); // 2 drivers
      driversCountChain.length = 2;
      mockDb.select.mockReturnValueOnce(driversCountChain);

      await expect(
        service.inviteDriver("mitra-1", "test@example.com")
      ).rejects.toThrow("Driver limit reached");
    });

    it("should reject invitation when driver already exists", async () => {
      mockDb.select.mockReturnValueOnce(createMockSelectChain(mockMitra));
      
      const driversCountChain = createMockSelectChain([]);
      driversCountChain.length = 0;
      mockDb.select.mockReturnValueOnce(driversCountChain);
      
      mockDb.select.mockReturnValueOnce(createMockSelectChain({ existing: "driver" }));

      await expect(
        service.inviteDriver("mitra-1", "existing@example.com")
      ).rejects.toThrow("Driver already exists for this Mitra");
    });

    it("should reject invitation when pending invite already exists", async () => {
      mockDb.select.mockReturnValueOnce(createMockSelectChain(mockMitra));
      
      const driversCountChain = createMockSelectChain([]);
      driversCountChain.length = 0;
      mockDb.select.mockReturnValueOnce(driversCountChain);
      
      mockDb.select.mockReturnValueOnce(createMockSelectChain(null));
      mockDb.select.mockReturnValueOnce(createMockSelectChain({ existing: "invite" }));

      await expect(
        service.inviteDriver("mitra-1", "pending@example.com")
      ).rejects.toThrow("Pending invitation already exists for this email");
    });
  });
});