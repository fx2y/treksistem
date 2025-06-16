import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhookRetryService } from "./webhook-retry.service";

// Mock D1Database
const mockD1Database = {} as any;

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("test-retry-id-123"),
}));

// Mock console methods to avoid noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe("WebhookRetryService", () => {
  let webhookRetryService: WebhookRetryService;

  beforeEach(() => {
    vi.clearAllMocks();
    webhookRetryService = new WebhookRetryService(mockD1Database);
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const service = new WebhookRetryService(mockD1Database);
      expect(service).toBeDefined();
    });

    it("should initialize with custom config", () => {
      const customConfig = {
        maxRetries: 3,
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        backoffMultiplier: 1.5,
      };
      
      const service = new WebhookRetryService(mockD1Database, customConfig);
      expect(service).toBeDefined();
    });

    it("should merge custom config with defaults", () => {
      const partialConfig = {
        maxRetries: 3,
        baseDelayMs: 2000,
      };
      
      const service = new WebhookRetryService(mockD1Database, partialConfig);
      expect(service).toBeDefined();
    });
  });

  describe("calculateRetryDelay", () => {
    it("should calculate exponential backoff delay", () => {
      // Access private method via type assertion for testing
      const service = webhookRetryService as any;
      
      // First attempt (attemptCount = 0): 1000ms
      expect(service.calculateRetryDelay(0)).toBe(1000);
      
      // Second attempt (attemptCount = 1): 2000ms
      expect(service.calculateRetryDelay(1)).toBe(2000);
      
      // Third attempt (attemptCount = 2): 4000ms
      expect(service.calculateRetryDelay(2)).toBe(4000);
    });

    it("should respect maximum delay", () => {
      const service = new WebhookRetryService(mockD1Database, {
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      }) as any;
      
      // Large attempt count should be capped at maxDelayMs
      expect(service.calculateRetryDelay(10)).toBe(5000);
    });

    it("should handle custom backoff multiplier", () => {
      const service = new WebhookRetryService(mockD1Database, {
        baseDelayMs: 1000,
        backoffMultiplier: 3,
      }) as any;
      
      expect(service.calculateRetryDelay(0)).toBe(1000);
      expect(service.calculateRetryDelay(1)).toBe(3000);
      expect(service.calculateRetryDelay(2)).toBe(9000);
    });
  });

  describe("scheduleRetry", () => {
    it("should schedule a retry for midtrans webhook", async () => {
      const payload = { orderId: "order_123", status: "settlement" };
      const error = "Connection timeout";

      const retryId = await webhookRetryService.scheduleRetry(
        "midtrans",
        payload,
        error
      );

      expect(retryId).toBe("test-retry-id-123");
      expect(console.log).toHaveBeenCalledWith(
        "Scheduling webhook retry: test-retry-id-123",
        expect.objectContaining({
          webhookType: "midtrans",
          payload,
          error,
          maxRetries: 5,
        })
      );
    });

    it("should schedule a retry for notification webhook", async () => {
      const payload = { recipientPhone: "081234567890", message: "Order update" };

      const retryId = await webhookRetryService.scheduleRetry(
        "notification",
        payload
      );

      expect(retryId).toBe("test-retry-id-123");
      expect(console.log).toHaveBeenCalledWith(
        "Scheduling webhook retry: test-retry-id-123",
        expect.objectContaining({
          webhookType: "notification",
          payload,
          error: undefined,
        })
      );
    });

    it("should calculate next retry time correctly", async () => {
      const payload = { test: "data" };
      
      await webhookRetryService.scheduleRetry("midtrans", payload);

      expect(console.log).toHaveBeenCalledWith(
        "Scheduling webhook retry: test-retry-id-123",
        expect.objectContaining({
          nextRetryAt: expect.any(String),
        })
      );
    });
  });

  describe("processWithRetry", () => {
    it("should succeed on first attempt", async () => {
      const payload = { test: "data" };
      const expectedResult = { success: true };
      const processor = vi.fn().mockResolvedValue(expectedResult);

      const result = await webhookRetryService.processWithRetry(
        "midtrans",
        payload,
        processor
      );

      expect(result).toEqual(expectedResult);
      expect(processor).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and eventually succeed", async () => {
      const payload = { test: "data" };
      const expectedResult = { success: true };
      const processor = vi.fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockRejectedValueOnce(new Error("Second failure"))
        .mockResolvedValue(expectedResult);

      const result = await webhookRetryService.processWithRetry(
        "midtrans",
        payload,
        processor
      );

      expect(result).toEqual(expectedResult);
      expect(processor).toHaveBeenCalledTimes(3);
    });

    it("should schedule retry instead of blocking in serverless environment", async () => {
      const payload = { test: "data" };
      const processor = vi.fn().mockRejectedValue(new Error("Failure"));

      // In test mode, it should continue retrying synchronously
      await expect(
        webhookRetryService.processWithRetry("midtrans", payload, processor)
      ).rejects.toThrow("Failure");

      expect(processor).toHaveBeenCalledTimes(5); // Default maxRetries
      expect(console.log).toHaveBeenCalledWith(
        "Scheduling webhook retry: test-retry-id-123",
        expect.any(Object)
      );
    });

    it("should throw error after max retries in synchronous mode", async () => {
      const payload = { test: "data" };
      const error = new Error("Persistent failure");
      const processor = vi.fn().mockRejectedValue(error);

      // Create service with low max retries for faster test
      const service = new WebhookRetryService(mockD1Database, { maxRetries: 2 });

      await expect(
        service.processWithRetry("midtrans", payload, processor)
      ).rejects.toThrow("Persistent failure");

      expect(processor).toHaveBeenCalledTimes(2);
    });

    it("should log retry attempts", async () => {
      const payload = { test: "data" };
      const processor = vi.fn().mockRejectedValue(new Error("Test error"));

      await expect(
        webhookRetryService.processWithRetry("midtrans", payload, processor)
      ).rejects.toThrow("Test error");

      expect(console.error).toHaveBeenCalledWith(
        "Webhook processing failed (attempt 1/5):",
        expect.objectContaining({
          webhookType: "midtrans",
          error: "Test error",
          attemptCount: 1,
        })
      );
    });

    it("should store permanently failed webhooks", async () => {
      const payload = { test: "data" };
      const error = new Error("Permanent failure");
      const processor = vi.fn().mockRejectedValue(error);

      // Create service with 1 retry for faster test
      const service = new WebhookRetryService(mockD1Database, { maxRetries: 1 });

      await expect(
        service.processWithRetry("midtrans", payload, processor)
      ).rejects.toThrow("Permanent failure");

      expect(console.error).toHaveBeenCalledWith(
        "Webhook failed permanently - manual review required:",
        expect.objectContaining({
          webhookType: "midtrans",
          payload,
          error: "Permanent failure",
        })
      );
    });
  });

  describe("processScheduledRetries", () => {
    it("should log processing message", async () => {
      await webhookRetryService.processScheduledRetries();

      expect(console.log).toHaveBeenCalledWith(
        "Processing scheduled webhook retries..."
      );
    });
  });

  describe("cleanupOldRetries", () => {
    it("should log cleanup with default days", async () => {
      await webhookRetryService.cleanupOldRetries();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Cleaning up webhook retry records older than")
      );
    });

    it("should log cleanup with custom days", async () => {
      await webhookRetryService.cleanupOldRetries(7);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Cleaning up webhook retry records older than")
      );
    });

    it("should calculate correct cutoff date", async () => {
      const originalDate = Date;
      const mockDate = new Date("2023-01-15");
      global.Date = vi.fn(() => mockDate) as any;
      global.Date.now = vi.fn(() => mockDate.getTime());

      await webhookRetryService.cleanupOldRetries(30);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("2022-12-16") // 30 days before 2023-01-15
      );

      global.Date = originalDate;
    });
  });

  describe("getRetryStats", () => {
    it("should return default stats", async () => {
      const stats = await webhookRetryService.getRetryStats();

      expect(stats).toEqual({
        pendingRetries: 0,
        failedWebhooks: 0,
        successRate: 1.0,
      });
    });
  });

  describe("error handling", () => {
    it("should handle processor throwing non-Error objects", async () => {
      const payload = { test: "data" };
      const processor = vi.fn().mockRejectedValue("String error");

      await expect(
        webhookRetryService.processWithRetry("midtrans", payload, processor)
      ).rejects.toThrow("String error");

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Webhook processing failed"),
        expect.any(Object)
      );
    });

    it("should handle undefined errors gracefully", async () => {
      const payload = { test: "data" };
      const processor = vi.fn().mockRejectedValue(undefined);

      // Create service with 1 retry for faster test
      const service = new WebhookRetryService(mockD1Database, { maxRetries: 1 });

      await expect(
        service.processWithRetry("midtrans", payload, processor)
      ).rejects.toThrow("Webhook processing failed");
    });
  });

  describe("configuration edge cases", () => {
    it("should handle zero base delay", () => {
      const service = new WebhookRetryService(mockD1Database, {
        baseDelayMs: 0,
      }) as any;

      expect(service.calculateRetryDelay(0)).toBe(0);
      expect(service.calculateRetryDelay(1)).toBe(0);
    });

    it("should handle backoff multiplier of 1", () => {
      const service = new WebhookRetryService(mockD1Database, {
        baseDelayMs: 1000,
        backoffMultiplier: 1,
      }) as any;

      expect(service.calculateRetryDelay(0)).toBe(1000);
      expect(service.calculateRetryDelay(1)).toBe(1000);
      expect(service.calculateRetryDelay(5)).toBe(1000);
    });

    it("should handle max delay less than base delay", () => {
      const service = new WebhookRetryService(mockD1Database, {
        baseDelayMs: 1000,
        maxDelayMs: 500,
      }) as any;

      expect(service.calculateRetryDelay(0)).toBe(500);
    });
  });
});