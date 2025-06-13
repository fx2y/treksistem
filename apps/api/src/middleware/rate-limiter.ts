import { Context, Next } from "hono";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyGenerator?: (c: Context) => string; // Function to generate rate limit key
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    keyGenerator = c => c.req.header("cf-connecting-ip") || "unknown",
  } = options;

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);
    const now = Date.now();

    // Clean up expired entries
    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }

    // Initialize or get current count
    if (!store[key]) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Check if limit exceeded
    if (store[key].count >= max) {
      return c.json(
        {
          error: "Too many requests",
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
        },
        429
      );
    }

    // Increment counter
    store[key].count++;

    // Set headers
    c.header("X-RateLimit-Limit", max.toString());
    c.header("X-RateLimit-Remaining", (max - store[key].count).toString());
    c.header("X-RateLimit-Reset", new Date(store[key].resetTime).toISOString());

    await next();
  };
}
