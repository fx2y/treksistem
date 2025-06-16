import { users, mitras, vehicles, invoices } from "@treksistem/db";
import type { DbClient } from "@treksistem/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export class TestService {
  constructor(
    private db: DbClient,
    private directDb: D1Database
  ) {}

  async setupBaseTestData() {
    // Clear existing test data (ignore errors if data doesn't exist)
    try {
      await this.db.delete(vehicles).where(eq(vehicles.mitraId, "mitra_1"));
      await this.db.delete(vehicles).where(eq(vehicles.mitraId, "mitra_2"));
    } catch (e) {
      /* ignore */
    }

    try {
      await this.db.delete(mitras).where(eq(mitras.id, "mitra_1"));
      await this.db.delete(mitras).where(eq(mitras.id, "mitra_2"));
    } catch (e) {
      /* ignore */
    }

    try {
      await this.db.delete(users).where(eq(users.id, "user_mitra_1"));
      await this.db.delete(users).where(eq(users.id, "user_mitra_2"));
      await this.db.delete(users).where(eq(users.id, "user_driver_1"));
    } catch (e) {
      /* ignore */
    }

    // Create test users (ignore if they already exist)
    try {
      await this.db.insert(users).values([
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
      await this.db.insert(mitras).values([
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

    return { message: "Test data setup complete" };
  }

  async setupLogbookTestData() {
    // Clean up existing test data first
    await this.directDb.exec(
      `DELETE FROM order_reports WHERE id IN ('report_1_pickup', 'report_1_dropoff', 'report_2_pickup', 'report_2_dropoff')`
    );
    await this.directDb.exec(
      `DELETE FROM order_stops WHERE id IN ('stop_1_pickup', 'stop_1_dropoff', 'stop_2_pickup', 'stop_2_dropoff')`
    );
    await this.directDb.exec(
      `DELETE FROM orders WHERE id IN ('order_1', 'order_2')`
    );
    await this.directDb.exec(`DELETE FROM services WHERE id = 'service_1'`);
    await this.directDb.exec(
      `DELETE FROM vehicles WHERE id IN ('vehicle_v1', 'vehicle_v2')`
    );
    await this.directDb.exec(`DELETE FROM drivers WHERE id = 'driver_a1'`);

    // Create driver for Mitra 1
    await this.directDb.exec(
      `INSERT INTO drivers (id, user_id, mitra_id, status) VALUES ('driver_a1', 'user_driver_1', 'mitra_1', 'active')`
    );

    // Create vehicles for Mitra 1
    await this.directDb.exec(
      `INSERT INTO vehicles (id, mitra_id, license_plate, description) VALUES ('vehicle_v1', 'mitra_1', 'N1234ABC', 'Toyota Avanza 2020')`
    );
    await this.directDb.exec(
      `INSERT INTO vehicles (id, mitra_id, license_plate, description) VALUES ('vehicle_v2', 'mitra_1', 'N5678XYZ', 'Honda Brio 2021')`
    );

    // Create service for Mitra 1
    await this.directDb.exec(
      `INSERT INTO services (id, mitra_id, name, is_public) VALUES ('service_1', 'mitra_1', 'Food Delivery Service', 1)`
    );

    // Create orders with timestamps
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();

    const order1PublicId = nanoid(12);
    const order2PublicId = nanoid(12);

    await this.directDb.exec(
      `INSERT INTO orders (id, public_id, service_id, assigned_driver_id, assigned_vehicle_id, status, orderer_name, orderer_phone, recipient_name, recipient_phone, estimated_cost, created_at) VALUES ('order_1', '${order1PublicId}', 'service_1', 'driver_a1', 'vehicle_v1', 'delivered', 'Customer A', '+628123456789', 'Recipient A', '+628123456789', 15000, ${Math.floor(yesterday.getTime() / 1000)})`
    );
    await this.directDb.exec(
      `INSERT INTO orders (id, public_id, service_id, assigned_driver_id, assigned_vehicle_id, status, orderer_name, orderer_phone, recipient_name, recipient_phone, estimated_cost, created_at) VALUES ('order_2', '${order2PublicId}', 'service_1', 'driver_a1', 'vehicle_v2', 'delivered', 'Customer B', '+628987654321', 'Recipient B', '+628987654321', 20000, ${Math.floor(today.getTime() / 1000)})`
    );

    // Create order stops
    await this.directDb.exec(
      `INSERT INTO order_stops (id, order_id, sequence, type, lat, lng, address, status) VALUES ('stop_1_pickup', 'order_1', 1, 'pickup', -6.200000, 106.816666, 'Jl. Merdeka No. 5', 'completed')`
    );
    await this.directDb.exec(
      `INSERT INTO order_stops (id, order_id, sequence, type, lat, lng, address, status) VALUES ('stop_1_dropoff', 'order_1', 2, 'dropoff', -6.208889, 106.845833, 'Jl. Sudirman No. 10', 'completed')`
    );
    await this.directDb.exec(
      `INSERT INTO order_stops (id, order_id, sequence, type, lat, lng, address, status) VALUES ('stop_2_pickup', 'order_2', 1, 'pickup', -6.175000, 106.827778, 'Jl. Pahlawan No. 1', 'completed')`
    );
    await this.directDb.exec(
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

    // Create order reports with proper timestamps
    await this.directDb.exec(
      `INSERT INTO order_reports (id, order_id, driver_id, stage, notes, timestamp) VALUES ('report_1_pickup', 'order_1', 'driver_a1', 'pickup', 'Jl. Merdeka No. 5', '${yesterdayPickup.toISOString()}')`
    );
    await this.directDb.exec(
      `INSERT INTO order_reports (id, order_id, driver_id, stage, notes, timestamp) VALUES ('report_1_dropoff', 'order_1', 'driver_a1', 'dropoff', 'Jl. Sudirman No. 10', '${yesterdayDropoff.toISOString()}')`
    );
    await this.directDb.exec(
      `INSERT INTO order_reports (id, order_id, driver_id, stage, notes, timestamp) VALUES ('report_2_pickup', 'order_2', 'driver_a1', 'pickup', 'Jl. Pahlawan No. 1', '${todayPickup.toISOString()}')`
    );
    await this.directDb.exec(
      `INSERT INTO order_reports (id, order_id, driver_id, stage, notes, timestamp) VALUES ('report_2_dropoff', 'order_2', 'driver_a1', 'dropoff', 'Jl. Veteran No. 2', '${todayDropoff.toISOString()}')`
    );

    return {
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
    };
  }

  async cleanupTestData() {
    // Clean up in reverse order of dependencies
    await this.db.delete(vehicles).where(eq(vehicles.mitraId, "mitra_1"));
    await this.db.delete(vehicles).where(eq(vehicles.mitraId, "mitra_2"));
    await this.db.delete(mitras).where(eq(mitras.id, "mitra_1"));
    await this.db.delete(mitras).where(eq(mitras.id, "mitra_2"));
    await this.db.delete(users).where(eq(users.id, "user_mitra_1"));
    await this.db.delete(users).where(eq(users.id, "user_mitra_2"));
    await this.db.delete(users).where(eq(users.id, "user_driver_1"));

    return { message: "Test data cleanup complete" };
  }

  async setupShowcaseData() {
    // Create showcase personas directly in production

    // Clean existing showcase data in reverse dependency order
    try {
      await this.directDb.exec(
        `DELETE FROM invoices WHERE mitra_id = 'mitra_katering_bu_ani'`
      );
    } catch (e) {
      /* ignore if doesn't exist */
    }
    try {
      await this.directDb.exec(
        `DELETE FROM drivers WHERE user_id = 'user_budi_showcase'`
      );
    } catch (e) {
      /* ignore if doesn't exist */
    }
    try {
      await this.directDb.exec(
        `DELETE FROM mitras WHERE id = 'mitra_katering_bu_ani'`
      );
    } catch (e) {
      /* ignore if doesn't exist */
    }
    try {
      await this.directDb.exec(
        `DELETE FROM users WHERE id IN ('user_admin_showcase', 'user_bu_ani_showcase', 'user_budi_showcase', 'user_andi_showcase')`
      );
    } catch (e) {
      /* ignore if doesn't exist */
    }

    // Create showcase users
    try {
      await this.directDb.exec(
        `INSERT INTO users (id, google_id, email, name, role) VALUES ('user_admin_showcase', 'google_admin_showcase', 'admin@treksistem.com', 'Master Admin', 'admin')`
      );
    } catch (e) {
      /* ignore if already exists */
    }
    try {
      await this.directDb.exec(
        `INSERT INTO users (id, google_id, email, name, role) VALUES ('user_bu_ani_showcase', 'google_bu_ani_showcase', 'bu.ani@example.com', 'Bu Ani', 'user')`
      );
    } catch (e) {
      /* ignore if already exists */
    }
    try {
      await this.directDb.exec(
        `INSERT INTO users (id, google_id, email, name, role) VALUES ('user_budi_showcase', 'google_budi_showcase', 'budi.driver@example.com', 'Budi Santoso', 'user')`
      );
    } catch (e) {
      /* ignore if already exists */
    }
    try {
      await this.directDb.exec(
        `INSERT INTO users (id, google_id, email, name, role) VALUES ('user_andi_showcase', 'google_andi_showcase', 'andi.customer@example.com', 'Andi Customer', 'user')`
      );
    } catch (e) {
      /* ignore if already exists */
    }

    // Create Katering Bu Ani mitra
    try {
      await this.directDb.exec(
        `INSERT INTO mitras (id, user_id, business_name, address, phone, lat, lng, subscription_status, active_driver_limit, has_completed_onboarding) VALUES ('mitra_katering_bu_ani', 'user_bu_ani_showcase', 'Katering Bu Ani', 'Jl. Raya Malang No. 123, Malang, Jawa Timur', '+628123456789', -7.9797, 112.6304, 'active', 5, 1)`
      );
    } catch (e) {
      /* ignore if already exists */
    }

    // Create driver record for Budi (assigned to Bu Ani's mitra)
    try {
      const driverId = nanoid();
      await this.directDb.exec(
        `INSERT INTO drivers (id, user_id, mitra_id, status) VALUES ('${driverId}', 'user_budi_showcase', 'mitra_katering_bu_ani', 'active')`
      );
    } catch (e) {
      /* ignore if already exists */
    }

    // Create pending subscription invoice for Bu Ani's mitra using Drizzle ORM
    try {
      const amount = 10000; // Rp 10,000 for 1 active driver
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const description = `Platform Subscription - 1 driver for ${new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`;

      await this.db.insert(invoices).values({
        mitraId: "mitra_katering_bu_ani",
        type: "PLATFORM_SUBSCRIPTION",
        status: "pending",
        amount: amount,
        currency: "IDR",
        description: description,
        qrisPayload: `00020101021126580011ID.CO.QRIS.WWW011893600915301234560215ID1234567890123460303UMI51440014ID.CO.SHOPEE.WWW021893600915301234560215ID12345678901234603042024520412349900005304360053033605405${amount.toString().padStart(10, "0")}5802ID5909Treksistem6005Bangu61051234562070703A01630458B4`,
        dueDate: dueDate,
      });
      console.log("Invoice created successfully for showcase");
    } catch (e) {
      console.error("Invoice creation error:", e);
    }

    return {
      message: "Showcase data setup complete",
      personas: {
        admin: "admin@treksistem.com",
        mitra: "bu.ani@example.com",
        driver: "budi.driver@example.com",
        customer: "andi.customer@example.com",
      },
    };
  }
}
