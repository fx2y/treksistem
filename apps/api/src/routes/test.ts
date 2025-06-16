import { Hono } from "hono";
import { sign } from "hono/jwt";

import type { ServiceContainer } from "../services/factory";

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
  Variables: {
    services: ServiceContainer;
  };
}>();

// Test data setup endpoint (development only)
app.post("/setup", async c => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }

  const { testService } = c.get("services");
  const result = await testService.setupBaseTestData();
  return c.json(result);
});

// Comprehensive logbook test data setup (development only)
app.post("/setup-logbook", async c => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }

  const { testService } = c.get("services");
  const result = await testService.setupLogbookTestData();
  return c.json(result);
});

// Generate test tokens endpoint (development only)
app.get("/tokens", async c => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const secret = c.env.JWT_SECRET;

    const createToken = async (userId: string) => {
      const payload = {
        userId,
        iat: now,
        exp: now + 60 * 60 * 24, // 24 hours for testing
      };
      return await sign(payload, secret);
    };

    const tokens = {
      TOKEN_MITRA_1: await createToken("user_mitra_1"),
      TOKEN_MITRA_2: await createToken("user_mitra_2"),
      TOKEN_DRIVER_1: await createToken("user_driver_1"),
    };

    return c.json(tokens);
  } catch (error) {
    console.error("Token generation error:", error);
    return c.json({ error: "Token generation failed" }, 500);
  }
});

// Generate showcase tokens endpoint (production-safe)
app.get("/showcase-tokens", async c => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const secret = c.env.JWT_SECRET;

    const createToken = async (userId: string, role: string, email: string) => {
      const payload = {
        userId,
        role,
        email,
        iat: now,
        exp: now + 60 * 60 * 24 * 7, // 7 days for showcase
      };
      return await sign(payload, secret);
    };

    const tokens = {
      TOKEN_ADMIN: await createToken(
        "user_admin_showcase",
        "admin",
        "admin@treksistem.com"
      ),
      TOKEN_BU_ANI: await createToken(
        "user_bu_ani_showcase",
        "user",
        "bu.ani@example.com"
      ),
      TOKEN_BUDI: await createToken(
        "user_budi_showcase",
        "user",
        "budi.driver@example.com"
      ),
      TOKEN_ANDI: await createToken(
        "user_andi_showcase",
        "user",
        "andi.customer@example.com"
      ),
    };

    return c.json(tokens);
  } catch (error) {
    console.error("Showcase token generation error:", error);
    return c.json({ error: "Showcase token generation failed" }, 500);
  }
});

// Clean up test data
app.post("/cleanup", async c => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }

  const { testService } = c.get("services");
  const result = await testService.cleanupTestData();
  return c.json(result);
});

// Setup showcase personas (production-safe)
app.post("/setup-showcase", async c => {
  const { testService } = c.get("services");
  const result = await testService.setupShowcaseData();
  return c.json(result);
});

export default app;
