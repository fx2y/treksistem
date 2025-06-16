import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimitService } from "./rate-limit.service";
import { ForbiddenError } from "../lib/errors";

// Mock KV namespace
const mockKV = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
} as any;

const mockDb = {} as any;

// Mock console.warn to suppress warnings in tests
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe("RateLimitService", () => {
  let rateLimitService: RateLimitService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with in-memory storage", () => {
    beforeEach(() => {
      rateLimitService = new RateLimitService({
        db: mockDb,
        // No redisKV provided, will use in-memory
      });
    });

    it("should initialize with default rules", () => {
      expect(rateLimitService).toBeDefined();
      expect(console.warn).toHaveBeenCalledWith(
        "RATE_LIMIT_KV not configured, using in-memory rate limiting"
      );
    });

    it("should allow requests within rate limit", async () => {
      const result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 max - 1 used
      expect(result.total).toBe(5);
      expect(result.resetTime).toBeDefined();
    });

    it("should block requests when rate limit exceeded", async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await rateLimitService.checkRateLimit("auth:login", "user_123", "userId");
      }

      // 6th request should be blocked
      const result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.total).toBe(5);
    });

    it("should reset counter after window expires", async () => {
      // Mock current time
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = vi.fn(() => currentTime);

      // Make 5 requests to hit the limit
      for (let i = 0; i < 5; i++) {
        await rateLimitService.checkRateLimit("auth:login", "user_123", "userId");
      }

      // Verify rate limit is hit
      let result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );
      expect(result.allowed).toBe(false);

      // Advance time beyond the window (15 minutes + 1ms)
      currentTime += 15 * 60 * 1000 + 1;

      // Should be allowed again
      result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);

      // Restore original Date.now
      Date.now = originalNow;
    });

    it("should handle different endpoints independently", async () => {
      // Use auth:login limit (5 requests)
      for (let i = 0; i < 5; i++) {
        const result = await rateLimitService.checkRateLimit(
          "auth:login",
          "user_123",
          "userId"
        );
        expect(result.allowed).toBe(true);
      }

      // auth:login should be blocked
      const loginResult = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );
      expect(loginResult.allowed).toBe(false);

      // But auth:refresh should still be allowed (different endpoint)
      const refreshResult = await rateLimitService.checkRateLimit(
        "auth:refresh",
        "user_123",
        "userId"
      );
      expect(refreshResult.allowed).toBe(true);
    });

    it("should handle different users independently", async () => {
      // User 1 hits rate limit
      for (let i = 0; i < 5; i++) {
        await rateLimitService.checkRateLimit("auth:login", "user_123", "userId");
      }

      const user1Result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );
      expect(user1Result.allowed).toBe(false);

      // User 2 should still be allowed
      const user2Result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_456",
        "userId"
      );
      expect(user2Result.allowed).toBe(true);
    });

    it("should allow requests for undefined endpoints", async () => {
      const result = await rateLimitService.checkRateLimit(
        "undefined:endpoint",
        "user_123",
        "userId"
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeUndefined();
      expect(result.total).toBeUndefined();
    });

    it("should enforce rate limit and throw error", async () => {
      // Hit the rate limit
      for (let i = 0; i < 5; i++) {
        await rateLimitService.enforceRateLimit("auth:login", "user_123", "userId");
      }

      // Next request should throw
      await expect(
        rateLimitService.enforceRateLimit("auth:login", "user_123", "userId")
      ).rejects.toThrow(ForbiddenError);
    });

    it("should cleanup expired entries", async () => {
      // Mock current time
      const originalNow = Date.now;
      let currentTime = 1000000;
      Date.now = vi.fn(() => currentTime);

      // Make a request
      await rateLimitService.checkRateLimit("auth:login", "user_123", "userId");

      // Advance time way beyond window
      currentTime += 60 * 60 * 1000; // 1 hour

      // Cleanup should remove expired entries
      await rateLimitService.cleanup();

      // New request should start fresh
      const result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );
      expect(result.remaining).toBe(4); // Fresh start

      // Restore original Date.now
      Date.now = originalNow;
    });

    it("should add custom rules", () => {
      rateLimitService.addRule({
        endpoint: "custom:action",
        windowMs: 60000, // 1 minute
        maxRequests: 3,
      });

      // Should work with the new rule
      expect(() => {
        rateLimitService.checkRateLimit("custom:action", "user_123", "userId");
      }).not.toThrow();
    });
  });

  describe("with Redis/KV storage", () => {
    beforeEach(() => {
      rateLimitService = new RateLimitService({
        db: mockDb,
        redisKV: mockKV,
      });
    });

    it("should use Redis for rate limiting", async () => {
      mockKV.get.mockResolvedValue(null); // No existing data
      mockKV.put.mockResolvedValue(undefined);

      const result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );

      expect(result.allowed).toBe(true);
      expect(mockKV.get).toHaveBeenCalledWith("ratelimit:auth:login:userId:user_123");
      expect(mockKV.put).toHaveBeenCalled();
    });

    it("should handle existing Redis data", async () => {
      const existingData = {
        count: 2,
        resetTime: Date.now() + 60000, // Future time
      };
      mockKV.get.mockResolvedValue(JSON.stringify(existingData));
      mockKV.put.mockResolvedValue(undefined);

      const result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // 5 max - 3 used (2 existing + 1 new)
    });

    it("should handle Redis errors gracefully", async () => {
      mockKV.get.mockRejectedValue(new Error("Redis connection failed"));

      const result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );

      // Should fallback to allowing request
      expect(result.allowed).toBe(true);
    });

    it("should handle invalid JSON in Redis", async () => {
      mockKV.get.mockResolvedValue("invalid json");
      mockKV.put.mockResolvedValue(undefined);

      const result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );

      // Should treat as fresh request
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should handle expired Redis data", async () => {
      const expiredData = {
        count: 5,
        resetTime: Date.now() - 60000, // Past time
      };
      mockKV.get.mockResolvedValue(JSON.stringify(expiredData));
      mockKV.put.mockResolvedValue(undefined);

      const result = await rateLimitService.checkRateLimit(
        "auth:login",
        "user_123",
        "userId"
      );

      // Should reset and allow request
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });
});