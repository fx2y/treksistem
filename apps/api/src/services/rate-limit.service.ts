import type { DbClient } from "@treksistem/db";

import { ForbiddenError } from "../lib/errors";

export interface RateLimitServiceDependencies {
  db: DbClient;
  redisKV?: KVNamespace; // Optional Redis-like KV store for multi-instance deployments
}

export interface RateLimitRule {
  endpoint: string;
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyExtractor?: string; // How to extract the key (default: userId)
}

export interface RateLimitResult {
  allowed: boolean;
  resetTime?: number;
  remaining?: number;
  total?: number;
}

export class RateLimitService {
  private rules: Map<string, RateLimitRule> = new Map();
  private requests: Map<string, { count: number; resetTime: number }> =
    new Map();
  private useRedis: boolean;

  constructor(private deps: RateLimitServiceDependencies) {
    this.useRedis = !!deps.redisKV;
    this.setupDefaultRules();

    if (!this.useRedis) {
      console.warn(
        "RATE_LIMIT_KV not configured, using in-memory rate limiting"
      );
    }
  }

  private setupDefaultRules() {
    // Authentication endpoints
    this.addRule({
      endpoint: "auth:login",
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
    });

    this.addRule({
      endpoint: "auth:refresh",
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10, // 10 refresh attempts per 5 minutes
    });

    // Driver invitations
    this.addRule({
      endpoint: "driver:invite",
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 invitations per hour per mitra
      keyExtractor: "mitraId",
    });

    // Order creation
    this.addRule({
      endpoint: "order:create",
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 20, // 20 orders per 5 minutes
    });

    // Service management
    this.addRule({
      endpoint: "service:create",
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5, // 5 new services per hour per mitra
      keyExtractor: "mitraId",
    });
  }

  addRule(rule: RateLimitRule) {
    this.rules.set(rule.endpoint, rule);
  }

  async checkRateLimit(
    endpoint: string,
    identifier: string,
    keyType: string = "userId"
  ): Promise<RateLimitResult> {
    const rule = this.rules.get(endpoint);
    if (!rule) {
      // No rate limit rule defined - allow
      return { allowed: true };
    }

    if (this.useRedis && this.deps.redisKV) {
      return this.checkRateLimitRedis(endpoint, identifier, keyType, rule);
    } else {
      return this.checkRateLimitMemory(endpoint, identifier, keyType, rule);
    }
  }

  private async checkRateLimitRedis(
    endpoint: string,
    identifier: string,
    keyType: string,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${endpoint}:${keyType}:${identifier}`;
    const now = Date.now();
    const resetTime = now + rule.windowMs;

    try {
      // Get current count from Redis/KV
      const currentData = await this.deps.redisKV!.get(key);
      let current: { count: number; resetTime: number } | null = null;

      if (currentData) {
        try {
          current = JSON.parse(currentData);
        } catch (e) {
          // Invalid JSON, treat as null
          current = null;
        }
      }

      if (!current || current.resetTime <= now) {
        // First request in window or window expired
        const newData = {
          count: 1,
          resetTime: resetTime,
        };

        // Set with TTL in seconds
        const ttlSeconds = Math.ceil(rule.windowMs / 1000);
        await this.deps.redisKV!.put(key, JSON.stringify(newData), {
          expirationTtl: ttlSeconds,
        });

        return {
          allowed: true,
          remaining: rule.maxRequests - 1,
          total: rule.maxRequests,
          resetTime: resetTime,
        };
      }

      if (current.count >= rule.maxRequests) {
        // Rate limit exceeded
        return {
          allowed: false,
          remaining: 0,
          total: rule.maxRequests,
          resetTime: current.resetTime,
        };
      }

      // Increment counter
      current.count++;
      const ttlSeconds = Math.ceil((current.resetTime - now) / 1000);
      await this.deps.redisKV!.put(key, JSON.stringify(current), {
        expirationTtl: Math.max(ttlSeconds, 1), // Ensure at least 1 second TTL
      });

      return {
        allowed: true,
        remaining: rule.maxRequests - current.count,
        total: rule.maxRequests,
        resetTime: current.resetTime,
      };
    } catch (error) {
      console.error(`Redis rate limit check failed for ${key}:`, error);
      // Fallback to allowing request if Redis fails
      return { allowed: true };
    }
  }

  private async checkRateLimitMemory(
    endpoint: string,
    identifier: string,
    keyType: string,
    rule: RateLimitRule
  ): Promise<RateLimitResult> {
    const key = `${endpoint}:${keyType}:${identifier}`;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    // Clean up old entries
    this.cleanupExpiredEntries(windowStart);

    const current = this.requests.get(key);

    if (!current) {
      // First request in window
      this.requests.set(key, {
        count: 1,
        resetTime: now + rule.windowMs,
      });

      return {
        allowed: true,
        remaining: rule.maxRequests - 1,
        total: rule.maxRequests,
        resetTime: now + rule.windowMs,
      };
    }

    if (current.resetTime <= now) {
      // Window has expired, reset
      this.requests.set(key, {
        count: 1,
        resetTime: now + rule.windowMs,
      });

      return {
        allowed: true,
        remaining: rule.maxRequests - 1,
        total: rule.maxRequests,
        resetTime: now + rule.windowMs,
      };
    }

    if (current.count >= rule.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        total: rule.maxRequests,
        resetTime: current.resetTime,
      };
    }

    // Increment counter
    current.count++;
    this.requests.set(key, current);

    return {
      allowed: true,
      remaining: rule.maxRequests - current.count,
      total: rule.maxRequests,
      resetTime: current.resetTime,
    };
  }

  async enforceRateLimit(
    endpoint: string,
    identifier: string,
    keyType: string = "userId"
  ): Promise<void> {
    const result = await this.checkRateLimit(endpoint, identifier, keyType);

    if (!result.allowed) {
      const resetIn = result.resetTime
        ? Math.ceil((result.resetTime - Date.now()) / 1000)
        : 0;
      throw new ForbiddenError(
        `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        "RATE_LIMIT_EXCEEDED"
      );
    }
  }

  private cleanupExpiredEntries(cutoffTime: number) {
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetTime <= cutoffTime) {
        this.requests.delete(key);
      }
    }
  }

  // For production, you might want to persist rate limit data to Redis or DB
  // This in-memory implementation is fine for single-instance deployments
  async cleanup(): Promise<void> {
    const now = Date.now();
    this.cleanupExpiredEntries(now);
  }
}
