import { Context, Next } from "hono";

interface RateLimitData {
  count: number;
  resetTime: number;
}

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
    const kv = c.env.RATE_LIMIT_KV as KVNamespace;
    if (!kv) {
      console.warn("RATE_LIMIT_KV not configured, skipping rate limiting");
      await next();
      return;
    }

    const key = `rate_limit:${keyGenerator(c)}`;
    const now = Date.now();

    // Get current rate limit data
    const existing = (await kv.get(key, "json")) as RateLimitData | null;

    // Check if window has expired
    if (existing && now > existing.resetTime) {
      await kv.delete(key);
    }

    // Get fresh data or initialize
    const data =
      existing && now <= existing.resetTime
        ? existing
        : { count: 0, resetTime: now + windowMs };

    // Check if limit exceeded
    if (data.count >= max) {
      return c.json(
        {
          error: "Too many requests",
          retryAfter: Math.ceil((data.resetTime - now) / 1000),
        },
        429
      );
    }

    // Increment counter and store
    data.count++;
    await kv.put(key, JSON.stringify(data), {
      expirationTtl: Math.ceil(windowMs / 1000),
    });

    // Set headers
    c.header("X-RateLimit-Limit", max.toString());
    c.header("X-RateLimit-Remaining", (max - data.count).toString());
    c.header("X-RateLimit-Reset", new Date(data.resetTime).toISOString());

    await next();
  };
}
