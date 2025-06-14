import { users, mitras, vehicles } from "@treksistem/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { nanoid } from "nanoid";

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

  try {
    const { db } = c.get("services");

    // Clear existing test data (ignore errors if data doesn't exist)
    try {
      await db.delete(vehicles).where(eq(vehicles.mitraId, "mitra_1"));
      await db.delete(vehicles).where(eq(vehicles.mitraId, "mitra_2"));
    } catch (e) {
      /* ignore */
    }

    try {
      await db.delete(mitras).where(eq(mitras.id, "mitra_1"));
      await db.delete(mitras).where(eq(mitras.id, "mitra_2"));
    } catch (e) {
      /* ignore */
    }

    try {
      await db.delete(users).where(eq(users.id, "user_mitra_1"));
      await db.delete(users).where(eq(users.id, "user_mitra_2"));
      await db.delete(users).where(eq(users.id, "user_driver_1"));
    } catch (e) {
      /* ignore */
    }

    // Create test users (ignore if they already exist)
    try {
      await db.insert(users).values([
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
      await db.insert(mitras).values([
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

// Comprehensive logbook test data setup (development only)
app.post("/setup-logbook", async c => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not available in production" }, 403);
  }

  try {
    // Use direct SQL to avoid schema issues
    const db = c.env.DB;

    // Clean up existing test data first
    await db.exec(
      `DELETE FROM order_reports WHERE id IN ('report_1_pickup', 'report_1_dropoff', 'report_2_pickup', 'report_2_dropoff')`
    );
    await db.exec(
      `DELETE FROM order_stops WHERE id IN ('stop_1_pickup', 'stop_1_dropoff', 'stop_2_pickup', 'stop_2_dropoff')`
    );
    await db.exec(`DELETE FROM orders WHERE id IN ('order_1', 'order_2')`);
    await db.exec(`DELETE FROM services WHERE id = 'service_1'`);
    await db.exec(
      `DELETE FROM vehicles WHERE id IN ('vehicle_v1', 'vehicle_v2')`
    );
    await db.exec(`DELETE FROM drivers WHERE id = 'driver_a1'`);

    // Create driver for Mitra 1
    await db.exec(
      `INSERT INTO drivers (id, user_id, mitra_id, status) VALUES ('driver_a1', 'user_driver_1', 'mitra_1', 'active')`
    );

    // Create vehicles for Mitra 1
    await db.exec(
      `INSERT INTO vehicles (id, mitra_id, license_plate, description) VALUES ('vehicle_v1', 'mitra_1', 'N1234ABC', 'Toyota Avanza 2020')`
    );
    await db.exec(
      `INSERT INTO vehicles (id, mitra_id, license_plate, description) VALUES ('vehicle_v2', 'mitra_1', 'N5678XYZ', 'Honda Brio 2021')`
    );

    // Create service for Mitra 1
    await db.exec(
      `INSERT INTO services (id, mitra_id, service_name, description, is_active) VALUES ('service_1', 'mitra_1', 'Food Delivery Service', 'Fast food delivery', 1)`
    );

    // Create orders with timestamps
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();

    const order1PublicId = nanoid(12);
    const order2PublicId = nanoid(12);

    await db.exec(
      `INSERT INTO orders (id, public_id, service_id, assigned_driver_id, assigned_vehicle_id, status, created_at) VALUES ('order_1', '${order1PublicId}', 'service_1', 'driver_a1', 'vehicle_v1', 'delivered', ${Math.floor(yesterday.getTime() / 1000)})`
    );
    await db.exec(
      `INSERT INTO orders (id, public_id, service_id, assigned_driver_id, assigned_vehicle_id, status, created_at) VALUES ('order_2', '${order2PublicId}', 'service_1', 'driver_a1', 'vehicle_v2', 'delivered', ${Math.floor(today.getTime() / 1000)})`
    );

    // Create order stops
    await db.exec(
      `INSERT INTO order_stops (id, order_id, sequence, type, lat, lng, address, status) VALUES ('stop_1_pickup', 'order_1', 1, 'pickup', -6.200000, 106.816666, 'Jl. Merdeka No. 5', 'completed')`
    );
    await db.exec(
      `INSERT INTO order_stops (id, order_id, sequence, type, lat, lng, address, status) VALUES ('stop_1_dropoff', 'order_1', 2, 'dropoff', -6.208889, 106.845833, 'Jl. Sudirman No. 10', 'completed')`
    );
    await db.exec(
      `INSERT INTO order_stops (id, order_id, sequence, type, lat, lng, address, status) VALUES ('stop_2_pickup', 'order_2', 1, 'pickup', -6.175000, 106.827778, 'Jl. Pahlawan No. 1', 'completed')`
    );
    await db.exec(
      `INSERT INTO order_stops (id, order_id, sequence, type, lat, lng, address, status) VALUES ('stop_2_dropoff', 'order_2', 2, 'dropoff', -6.183333, 106.833333, 'Jl. Veteran No. 2', 'completed')`
    );

    // Create order reports with proper timestamps
    const yesterdayPickup = new Date(yesterday);
    yesterdayPickup.setHours(10, 0, 0, 0);
    const yesterdayDropoff = new Date(yesterday);
    yesterdayDropoff.setHours(11, 30, 0, 0);

    const todayPickup = new Date(today);
    todayPickup.setHours(14, 0, 0, 0);
    const todayDropoff = new Date(today);
    todayDropoff.setHours(15, 30, 0, 0);

    await db.exec(`INSERT INTO order_reports (id, order_id, driver_id, stage, notes, timestamp) VALUES 
      ('report_1_pickup', 'order_1', 'driver_a1', 'pickup', 'Jl. Merdeka No. 5', '${yesterdayPickup.toISOString()}'),
      ('report_1_dropoff', 'order_1', 'driver_a1', 'dropoff', 'Jl. Sudirman No. 10', '${yesterdayDropoff.toISOString()}'),
      ('report_2_pickup', 'order_2', 'driver_a1', 'pickup', 'Jl. Pahlawan No. 1', '${todayPickup.toISOString()}'),
      ('report_2_dropoff', 'order_2', 'driver_a1', 'dropoff', 'Jl. Veteran No. 2', '${todayDropoff.toISOString()}')`);

    return c.json({
      message: "Logbook test data setup complete",
      data: {
        vehicleV1: "vehicle_v1",
        vehicleV2: "vehicle_v2",
        driverA1: "driver_a1",
        orderIds: ["order_1", "order_2"],
        orderPublicIds: [order1PublicId, order2PublicId],
        testDates: {
          yesterday: yesterday.toISOString().split("T")[0],
          today: today.toISOString().split("T")[0],
        },
      },
    });
  } catch (error) {
    console.error("Logbook setup error:", error);
    return c.json({ error: "Logbook setup failed" }, 500);
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
    const { db } = c.get("services");

    // Clean up in reverse order of dependencies
    await db.delete(vehicles).where(eq(vehicles.mitraId, "mitra_1"));
    await db.delete(vehicles).where(eq(vehicles.mitraId, "mitra_2"));
    await db.delete(mitras).where(eq(mitras.id, "mitra_1"));
    await db.delete(mitras).where(eq(mitras.id, "mitra_2"));
    await db.delete(users).where(eq(users.id, "user_mitra_1"));
    await db.delete(users).where(eq(users.id, "user_mitra_2"));
    await db.delete(users).where(eq(users.id, "user_driver_1"));

    return c.json({ message: "Test data cleanup complete" });
  } catch (error) {
    console.error("Cleanup error:", error);
    return c.json({ error: "Cleanup failed" }, 500);
  }
});

export default app;
