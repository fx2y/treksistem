import { createDbClient, users, mitras, vehicles } from "@treksistem/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { sign } from "hono/jwt";

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    JWT_SECRET: string;
  };
}>();

// Test data setup endpoint (development only)
app.post("/setup", async c => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }

  try {
    const dbInstance = createDbClient(c.env.DB);

    // Clear existing test data (ignore errors if data doesn't exist)
    try {
      await dbInstance.delete(vehicles).where(eq(vehicles.mitraId, "mitra_1"));
      await dbInstance.delete(vehicles).where(eq(vehicles.mitraId, "mitra_2"));
    } catch (e) {
      /* ignore */
    }

    try {
      await dbInstance.delete(mitras).where(eq(mitras.id, "mitra_1"));
      await dbInstance.delete(mitras).where(eq(mitras.id, "mitra_2"));
    } catch (e) {
      /* ignore */
    }

    try {
      await dbInstance.delete(users).where(eq(users.id, "user_mitra_1"));
      await dbInstance.delete(users).where(eq(users.id, "user_mitra_2"));
      await dbInstance.delete(users).where(eq(users.id, "user_driver_1"));
    } catch (e) {
      /* ignore */
    }

    // Create test users (ignore if they already exist)
    try {
      await dbInstance.insert(users).values([
        {
          id: "user_mitra_1",
          googleId: "mitra1_google",
          email: "mitra1@test.com",
          name: "Mitra User 1",
        },
        {
          id: "user_mitra_2",
          googleId: "mitra2_google",
          email: "mitra2@test.com",
          name: "Mitra User 2",
        },
        {
          id: "user_driver_1",
          googleId: "driver1_google",
          email: "driver1@test.com",
          name: "Driver User 1",
        },
      ]);
    } catch (e) {
      /* ignore if users already exist */
    }

    // Create test mitras (ignore if they already exist)
    try {
      await dbInstance.insert(mitras).values([
        {
          id: "mitra_1",
          userId: "user_mitra_1",
          businessName: "Mitra 1 Bakery",
          subscriptionStatus: "active",
          activeDriverLimit: 5,
        },
        {
          id: "mitra_2",
          userId: "user_mitra_2",
          businessName: "Mitra 2 Catering",
          subscriptionStatus: "active",
          activeDriverLimit: 3,
        },
      ]);
    } catch (e) {
      /* ignore if mitras already exist */
    }

    return c.json({ message: "Test data setup complete" });
  } catch (error) {
    console.error("Setup error:", error);
    return c.json({ error: "Setup failed" }, 500);
  }
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

// Clean up test data
app.post("/cleanup", async c => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }

  try {
    const dbInstance = createDbClient(c.env.DB);

    // Clean up in reverse order of dependencies
    await dbInstance.delete(vehicles).where(eq(vehicles.mitraId, "mitra_1"));
    await dbInstance.delete(vehicles).where(eq(vehicles.mitraId, "mitra_2"));
    await dbInstance.delete(mitras).where(eq(mitras.id, "mitra_1"));
    await dbInstance.delete(mitras).where(eq(mitras.id, "mitra_2"));
    await dbInstance.delete(users).where(eq(users.id, "user_mitra_1"));
    await dbInstance.delete(users).where(eq(users.id, "user_mitra_2"));
    await dbInstance.delete(users).where(eq(users.id, "user_driver_1"));

    return c.json({ message: "Test data cleanup complete" });
  } catch (error) {
    console.error("Cleanup error:", error);
    return c.json({ error: "Cleanup failed" }, 500);
  }
});

export default app;
