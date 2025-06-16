import {
  invoices,
  mitras,
  drivers,
  users,
} from "@treksistem/db";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { BillingService } from "./billing.service";
import { NotFoundError } from "../lib/errors";

// Create a comprehensive mock for the database client
const createMockSelectChain = (returnValue: any) => ({
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(returnValue),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
});

const createMockInsertChain = (returnValue: any) => ({
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue(returnValue),
});

const createMockUpdateChain = (returnValue: any) => ({
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue(returnValue),
});

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockMitra = {
  id: "mitra-1",
  userId: "user-1",
  businessName: "Test Mitra",
  subscriptionStatus: "active",
  activeDriverLimit: 5,
};

const mockInvoice = {
  id: 1,
  publicId: "invoice-123",
  mitraId: "mitra-1",
  type: "PLATFORM_SUBSCRIPTION",
  status: "pending",
  amount: 50000,
  currency: "IDR",
  description: "Test subscription",
  qrisPayload: "test-qris",
  dueDate: new Date(),
  paidAt: null,
  createdAt: new Date(),
};

describe("BillingService", () => {
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BillingService(mockDb as any);
  });

  describe("getSubscriptionStatus", () => {
    it("should return subscription status for valid mitra", async () => {
      // Mock mitra lookup
      mockDb.select.mockReturnValueOnce(createMockSelectChain(mockMitra));
      
      // Mock driver count check - return 3 drivers
      const driversCountChain = createMockSelectChain([{}, {}, {}]); // 3 drivers
      driversCountChain.length = 3;
      mockDb.select.mockReturnValueOnce(driversCountChain);

      const result = await service.getSubscriptionStatus("mitra-1");

      expect(result).toEqual({
        canInviteDrivers: true,
        currentDriverCount: 3,
        driverLimit: 5,
        subscriptionStatus: "active",
      });
    });

    it("should return false for canInviteDrivers when at limit", async () => {
      // Mock mitra lookup
      mockDb.select.mockReturnValueOnce(createMockSelectChain(mockMitra));
      
      // Mock driver count check - return 5 drivers (at limit)
      const driversCountChain = createMockSelectChain([{}, {}, {}, {}, {}]); // 5 drivers
      driversCountChain.length = 5;
      mockDb.select.mockReturnValueOnce(driversCountChain);

      const result = await service.getSubscriptionStatus("mitra-1");

      expect(result).toEqual({
        canInviteDrivers: false,
        currentDriverCount: 5,
        driverLimit: 5,
        subscriptionStatus: "active",
      });
    });

    it("should return false for canInviteDrivers when subscription inactive", async () => {
      const inactiveMitra = { ...mockMitra, subscriptionStatus: "past_due" };
      
      // Mock mitra lookup
      mockDb.select.mockReturnValueOnce(createMockSelectChain(inactiveMitra));
      
      // Mock driver count check
      const driversCountChain = createMockSelectChain([{}, {}]); // 2 drivers
      driversCountChain.length = 2;
      mockDb.select.mockReturnValueOnce(driversCountChain);

      const result = await service.getSubscriptionStatus("mitra-1");

      expect(result).toEqual({
        canInviteDrivers: false,
        currentDriverCount: 2,
        driverLimit: 5,
        subscriptionStatus: "past_due",
      });
    });

    it("should throw NotFoundError when mitra not found", async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(
        service.getSubscriptionStatus("nonexistent-mitra")
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("createInvoice", () => {
    it("should create platform subscription invoice", async () => {
      mockDb.insert.mockReturnValue(createMockInsertChain([mockInvoice]));

      const invoiceData = {
        mitraId: "mitra-1",
        type: "PLATFORM_SUBSCRIPTION" as const,
        amount: 50000,
        description: "Test subscription",
      };

      const result = await service.createInvoice(invoiceData);

      expect(mockDb.insert).toHaveBeenCalledWith(invoices);
      expect(result).toEqual(mockInvoice);
    });

    it("should create customer payment invoice", async () => {
      const customerInvoice = { ...mockInvoice, type: "CUSTOMER_PAYMENT" };
      mockDb.insert.mockReturnValue(createMockInsertChain([customerInvoice]));

      const invoiceData = {
        mitraId: "mitra-1",
        type: "CUSTOMER_PAYMENT" as const,
        amount: 25000,
        description: "Customer payment",
      };

      const result = await service.createInvoice(invoiceData);

      expect(mockDb.insert).toHaveBeenCalledWith(invoices);
      expect(result).toEqual(customerInvoice);
    });
  });

  describe("getInvoicesByMitra", () => {
    it("should return invoices for mitra", async () => {
      const invoices = [mockInvoice];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(invoices),
          }),
        }),
      });

      const result = await service.getInvoicesByMitra("mitra-1");

      expect(result).toEqual(invoices);
    });

    it("should filter by status when provided", async () => {
      const invoices = [mockInvoice];
      const selectChain = createMockSelectChain(invoices);
      mockDb.select.mockReturnValue(selectChain);

      await service.getInvoicesByMitra("mitra-1", "pending");

      expect(selectChain.where).toHaveBeenCalled();
    });
  });

  describe("getInvoiceByPublicId", () => {
    it("should return invoice by public ID", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockInvoice]),
        }),
      });

      const result = await service.getInvoiceByPublicId("invoice-123");

      expect(result).toEqual(mockInvoice);
    });

    it("should return undefined for non-existent invoice", async () => {
      mockDb.select.mockReturnValue(createMockSelectChain([]));

      const result = await service.getInvoiceByPublicId("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("updateInvoiceStatus", () => {
    it("should update invoice status from webhook", async () => {
      const updatedInvoice = { ...mockInvoice, status: "paid" };
      
      // Mock get invoice - first return the invoice
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockInvoice]),
        }),
      });
      
      // Mock update
      mockDb.update.mockReturnValue(createMockUpdateChain([updatedInvoice]));

      const webhookData = {
        publicInvoiceId: "invoice-123",
        transactionStatus: "capture",
        fraudStatus: "accept",
        transactionTime: "2023-01-01 12:00:00",
      };

      const result = await service.updateInvoiceStatus(webhookData);

      expect(result).toEqual(updatedInvoice);
    });

    it("should throw NotFoundError for non-existent invoice", async () => {
      mockDb.select.mockReturnValueOnce(createMockSelectChain([]));

      const webhookData = {
        publicInvoiceId: "nonexistent",
        transactionStatus: "capture",
      };

      await expect(
        service.updateInvoiceStatus(webhookData)
      ).rejects.toThrow(NotFoundError);
    });
  });
});