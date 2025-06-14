import type { Context, MiddlewareHandler } from "hono";

import type { RateLimitService } from "../services/rate-limit.service";

interface RateLimitOptions {
  endpoint: string;
  keyExtractor?: (c: Context) => string | null;
  keyType?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function createRateLimitMiddleware(
  rateLimitService: RateLimitService,
  options: RateLimitOptions
): MiddlewareHandler {
  return async (c, next) => {
    const { endpoint, keyExtractor, keyType = "userId" } = options;

    // Extract identifier
    let identifier: string;

    if (keyExtractor) {
      const extracted = keyExtractor(c);
      if (!extracted) {
        // Skip rate limiting if identifier cannot be extracted
        await next();
        return;
      }
      identifier = extracted;
    } else {
      // Default to userId from context
      const userId = c.get("userId");
      if (!userId) {
        // Skip rate limiting if no user context
        await next();
        return;
      }
      identifier = userId;
    }

    // Check rate limit before processing request
    const result = await rateLimitService.checkRateLimit(
      endpoint,
      identifier,
      keyType
    );

    if (!result.allowed) {
      const resetIn = result.resetTime
        ? Math.ceil((result.resetTime - Date.now()) / 1000)
        : 0;

      // Set rate limit headers
      c.header("X-RateLimit-Limit", result.total?.toString() || "0");
      c.header("X-RateLimit-Remaining", "0");
      c.header("X-RateLimit-Reset", result.resetTime?.toString() || "0");
      c.header("Retry-After", resetIn.toString());

      return c.json(
        {
          error: "Rate limit exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          resetTime: result.resetTime,
          retryAfter: resetIn,
        },
        429
      );
    }

    // Set rate limit headers for successful checks
    if (result.total && result.remaining !== undefined) {
      c.header("X-RateLimit-Limit", result.total.toString());
      c.header("X-RateLimit-Remaining", result.remaining.toString());
      if (result.resetTime) {
        c.header("X-RateLimit-Reset", result.resetTime.toString());
      }
    }

    await next();
  };
}

// Helper functions for common rate limiting patterns
export function rateLimitByUserId(
  rateLimitService: RateLimitService,
  endpoint: string
): MiddlewareHandler {
  return createRateLimitMiddleware(rateLimitService, {
    endpoint,
    keyType: "userId",
  });
}

export function rateLimitByMitraId(
  rateLimitService: RateLimitService,
  endpoint: string
): MiddlewareHandler {
  return createRateLimitMiddleware(rateLimitService, {
    endpoint,
    keyExtractor: c => c.get("mitraId"),
    keyType: "mitraId",
  });
}

export function rateLimitByIP(
  rateLimitService: RateLimitService,
  endpoint: string
): MiddlewareHandler {
  return createRateLimitMiddleware(rateLimitService, {
    endpoint,
    keyExtractor: c => {
      // Try to get real IP from common headers
      const forwarded = c.req.header("x-forwarded-for");
      if (forwarded) {
        return forwarded.split(",")[0].trim();
      }

      const realIp = c.req.header("x-real-ip");
      if (realIp) {
        return realIp;
      }

      // Fallback to connection IP (may not be available in all environments)
      return c.env?.CF_CONNECTING_IP || "unknown";
    },
    keyType: "ip",
  });
}
