#!/usr/bin/env node

/**
 * Master Showcase Data Seeding Script
 * 
 * This script sets up a complete sandbox environment for the stakeholder showcase.
 * It creates all necessary personas, business entities, historical data, and billing state.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../packages/db/src/schema.js";
import { nanoid } from "nanoid";

const DATABASE_URL = "file:./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/fc8ace76-5e4f-4bbe-8186-7d4198559f4d.sqlite";

class ShowcaseDataSeeder {
  constructor() {
    this.client = createClient({ url: DATABASE_URL });
    this.db = drizzle(this.client, { schema });
    this.personas = {};
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async cleanSlate() {
    this.log("🧹 Cleaning slate - wiping all relevant tables...");
    
    // Delete in proper order to respect foreign key constraints
    await this.db.delete(schema.orderReports);
    await this.db.delete(schema.orderStops);
    await this.db.delete(schema.orders);
    await this.db.delete(schema.invoices);
    await this.db.delete(schema.notificationLogs);
    await this.db.delete(schema.driverInvites);
    await this.db.delete(schema.drivers);
    await this.db.delete(schema.vehicles);
    await this.db.delete(schema.serviceRates);
    await this.db.delete(schema.servicesToVehicleTypes);
    await this.db.delete(schema.servicesToPayloadTypes);
    await this.db.delete(schema.servicesToFacilities);
    await this.db.delete(schema.services);
    await this.db.delete(schema.mitras);
    await this.db.delete(schema.auditLogs);
    await this.db.delete(schema.refreshTokens);
    await this.db.delete(schema.oauthSessions);
    await this.db.delete(schema.users);
    
    this.log("✅ All tables cleaned");
  }

  async createPersonas() {
    this.log("👥 Creating showcase personas...");

    // Master Admin
    const adminUser = await this.db.insert(schema.users).values({
      id: "user_admin_showcase",
      googleId: "google_admin_showcase",
      email: "admin@treksistem.com",
      name: "Master Admin",
      role: "admin",
      avatarUrl: "https://example.com/admin-avatar.jpg",
    }).returning().then(rows => rows[0]);

    // Mitra Bu Ani
    const buAniUser = await this.db.insert(schema.users).values({
      id: "user_bu_ani_showcase",
      googleId: "google_bu_ani_showcase", 
      email: "bu.ani@example.com",
      name: "Bu Ani",
      role: "user",
      avatarUrl: "https://example.com/bu-ani-avatar.jpg",
    }).returning().then(rows => rows[0]);

    // Driver Budi
    const budiUser = await this.db.insert(schema.users).values({
      id: "user_budi_showcase",
      googleId: "google_budi_showcase",
      email: "budi.driver@example.com", 
      name: "Budi Santoso",
      role: "user",
      avatarUrl: "https://example.com/budi-avatar.jpg",
    }).returning().then(rows => rows[0]);

    // Customer Andi
    const andiUser = await this.db.insert(schema.users).values({
      id: "user_andi_showcase", 
      googleId: "google_andi_showcase",
      email: "andi.customer@example.com",
      name: "Andi Customer",
      role: "user",
    }).returning().then(rows => rows[0]);

    this.personas = {
      admin: adminUser,
      buAni: buAniUser,
      budi: budiUser,
      andi: andiUser
    };

    this.log("✅ Personas created");
  }

  async createBusinessEntities() {
    this.log("🏢 Creating business entities...");

    // Create Katering Bu Ani Mitra
    const kateringBuAni = await this.db.insert(schema.mitras).values({
      id: "mitra_katering_bu_ani",
      userId: this.personas.buAni.id,
      businessName: "Katering Bu Ani",
      address: "Jl. Raya Malang No. 123, Malang, Jawa Timur",
      phone: "+628123456789",
      lat: -7.9797,
      lng: 112.6304,
      subscriptionStatus: "active",
      activeDriverLimit: 5,
      hasCompletedOnboarding: true,
    }).returning().then(rows => rows[0]);

    // Create master data for services
    const motorcycleVehicleType = await this.db.insert(schema.masterVehicleTypes).values({
      name: "Sepeda Motor",
      icon: "🏍️",
    }).returning().then(rows => rows[0]);

    const foodPayloadType = await this.db.insert(schema.masterPayloadTypes).values({
      name: "Makanan",
      icon: "🍽️",
    }).returning().then(rows => rows[0]);

    const thermalBagFacility = await this.db.insert(schema.masterFacilities).values({
      name: "Thermal Bag",
      icon: "🧊",
    }).returning().then(rows => rows[0]);

    // Create the service "Pengiriman Katering"
    const kateringService = await this.db.insert(schema.services).values({
      id: "service_pengiriman_katering",
      mitraId: kateringBuAni.id,
      name: "Pengiriman Katering",
      isPublic: true,
      maxRangeKm: 15.0,
    }).returning().then(rows => rows[0]);

    // Link service to vehicle types, payload types, and facilities
    await this.db.insert(schema.servicesToVehicleTypes).values({
      serviceId: kateringService.id,
      vehicleTypeId: motorcycleVehicleType.id,
    });

    await this.db.insert(schema.servicesToPayloadTypes).values({
      serviceId: kateringService.id,
      payloadTypeId: foodPayloadType.id,
    });

    await this.db.insert(schema.servicesToFacilities).values({
      serviceId: kateringService.id,
      facilityId: thermalBagFacility.id,
    });

    // Create service rates
    await this.db.insert(schema.serviceRates).values({
      serviceId: kateringService.id,
      baseFee: 5000,
      feePerKm: 2000,
      feePerKg: 1000,
    });

    // Create vehicle for Bu Ani
    const vehicle = await this.db.insert(schema.vehicles).values({
      id: "vehicle_bu_ani_1",
      mitraId: kateringBuAni.id,
      licensePlate: "N 1234 ABC",
      description: "Honda Vario 150",
      createdAt: new Date(),
    }).returning().then(rows => rows[0]);

    // Create driver record for Budi (already accepted invitation)
    const driver = await this.db.insert(schema.drivers).values({
      id: "driver_budi_showcase",
      userId: this.personas.budi.id,
      mitraId: kateringBuAni.id,
      status: "active",
    }).returning().then(rows => rows[0]);

    this.personas.mitra = kateringBuAni;
    this.personas.service = kateringService;
    this.personas.vehicle = vehicle;
    this.personas.driver = driver;

    this.log("✅ Business entities created");
  }

  async createHistoricalData() {
    this.log("📊 Creating historical data for Digital Logbook...");

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    // Historical Order 1 - Completed 3 days ago
    const order1 = await this.db.insert(schema.orders).values({
      id: "order_history_1",
      publicId: nanoid(12),
      serviceId: this.personas.service.id,
      assignedDriverId: this.personas.driver.id,
      assignedVehicleId: this.personas.vehicle.id,
      status: "delivered",
      ordererName: "Customer A",
      ordererPhone: "+628111111111",
      recipientName: "Customer A",
      recipientPhone: "+628111111111",
      estimatedCost: 15000,
      notes: "Catering untuk meeting kantor",
      createdAt: threeDaysAgo,
    }).returning().then(rows => rows[0]);

    // Order stops for historical order 1
    await this.db.insert(schema.orderStops).values([
      {
        orderId: order1.id,
        sequence: 1,
        type: "pickup",
        address: "Katering Bu Ani, Jl. Raya Malang No. 123",
        lat: -7.9797,
        lng: 112.6304,
        status: "completed",
      },
      {
        orderId: order1.id,
        sequence: 2,
        type: "dropoff",
        address: "Kantor PT ABC, Jl. Veteran No. 456",
        lat: -7.9826,
        lng: 112.6353,
        status: "completed",
      }
    ]);

    // Historical Order 2 - Completed 2 days ago
    const order2 = await this.db.insert(schema.orders).values({
      id: "order_history_2",
      publicId: nanoid(12),
      serviceId: this.personas.service.id,
      assignedDriverId: this.personas.driver.id,
      assignedVehicleId: this.personas.vehicle.id,
      status: "delivered",
      ordererName: "Customer B",
      ordererPhone: "+628222222222",
      recipientName: "Customer B",
      recipientPhone: "+628222222222",
      estimatedCost: 20000,
      notes: "Lunch box untuk keluarga",
      createdAt: twoDaysAgo,
    }).returning().then(rows => rows[0]);

    // Order stops for historical order 2
    await this.db.insert(schema.orderStops).values([
      {
        orderId: order2.id,
        sequence: 1,
        type: "pickup",
        address: "Katering Bu Ani, Jl. Raya Malang No. 123",
        lat: -7.9797,
        lng: 112.6304,
        status: "completed",
      },
      {
        orderId: order2.id,
        sequence: 2,
        type: "dropoff",
        address: "Perumahan Sawojajar, Jl. Melati No. 12",
        lat: -7.9344,
        lng: 112.6407,
        status: "completed",
      }
    ]);

    // Historical Order 3 - Completed yesterday
    const order3 = await this.db.insert(schema.orders).values({
      id: "order_history_3",
      publicId: nanoid(12),
      serviceId: this.personas.service.id,
      assignedDriverId: this.personas.driver.id,
      assignedVehicleId: this.personas.vehicle.id,
      status: "delivered",
      ordererName: "Customer C",
      ordererPhone: "+628333333333",
      recipientName: "Customer C",
      recipientPhone: "+628333333333",
      estimatedCost: 18000,
      notes: "Nasi box untuk acara arisan",
      createdAt: yesterday,
    }).returning().then(rows => rows[0]);

    // Order stops for historical order 3
    await this.db.insert(schema.orderStops).values([
      {
        orderId: order3.id,
        sequence: 1,
        type: "pickup",
        address: "Katering Bu Ani, Jl. Raya Malang No. 123",
        lat: -7.9797,
        lng: 112.6304,
        status: "completed",
      },
      {
        orderId: order3.id,
        sequence: 2,
        type: "dropoff", 
        address: "Balai RT 05, Jl. Kawi No. 89",
        lat: -7.9758,
        lng: 112.6283,
        status: "completed",
      }
    ]);

    // Add some order reports for the historical orders
    await this.db.insert(schema.orderReports).values([
      {
        orderId: order1.id,
        driverId: this.personas.driver.id,
        stage: "pickup",
        notes: "Makanan sudah diambil, kondisi baik",
        photoUrl: "https://example.com/pickup1.jpg",
        timestamp: new Date(threeDaysAgo.getTime() + 30 * 60 * 1000), // 30 min after order
      },
      {
        orderId: order1.id,
        driverId: this.personas.driver.id,
        stage: "dropoff",
        notes: "Makanan sudah diterima klien",
        photoUrl: "https://example.com/dropoff1.jpg",
        timestamp: new Date(threeDaysAgo.getTime() + 90 * 60 * 1000), // 90 min after order
      }
    ]);

    this.log("✅ Historical data created");
  }

  async createBillingState() {
    this.log("💰 Creating billing state...");

    // Create pending subscription invoice for Bu Ani
    const subscriptionInvoice = await this.db.insert(schema.invoices).values({
      publicId: nanoid(),
      mitraId: this.personas.mitra.id,
      type: "PLATFORM_SUBSCRIPTION",
      status: "pending",
      amount: 50000, // 50k IDR per month
      currency: "IDR",
      description: "Monthly subscription - Katering Bu Ani",
      qrisPayload: "00020101021226260014ID.DANA.WWW011893600009152408240301740204740602051570030303IDR520454005802ID5914Katering Bu Ani6007Jakarta6105123456105170613SUB_KATERING640400006304",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
      createdAt: new Date(),
    }).returning().then(rows => rows[0]);

    // Create a few historical paid invoices
    await this.db.insert(schema.invoices).values([
      {
        publicId: nanoid(),
        mitraId: this.personas.mitra.id,
        type: "PLATFORM_SUBSCRIPTION",
        status: "paid",
        amount: 50000,
        currency: "IDR",
        description: "Monthly subscription - Katering Bu Ani (Previous Month)",
        dueDate: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
        paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        publicId: nanoid(),
        mitraId: this.personas.mitra.id,
        type: "CUSTOMER_PAYMENT",
        status: "paid",
        amount: 15000,
        currency: "IDR",
        description: "Customer payment for Order #12345",
        paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      }
    ]);

    this.personas.pendingInvoice = subscriptionInvoice;

    this.log("✅ Billing state created");
  }

  async generateSummary() {
    this.log("📋 Showcase Environment Summary:");
    console.log("================================");
    console.log(`👤 Master Admin: ${this.personas.admin.email} (ID: ${this.personas.admin.id})`);
    console.log(`🏪 Mitra Bu Ani: ${this.personas.buAni.email} (ID: ${this.personas.buAni.id})`);
    console.log(`🚗 Driver Budi: ${this.personas.budi.email} (ID: ${this.personas.budi.id})`);
    console.log(`🛒 Customer Andi: ${this.personas.andi.email} (ID: ${this.personas.andi.id})`);
    console.log(`🏢 Mitra: ${this.personas.mitra.businessName} (ID: ${this.personas.mitra.id})`);
    console.log(`📦 Service: ${this.personas.service.name} (ID: ${this.personas.service.id})`);
    console.log(`🚙 Vehicle: ${this.personas.vehicle.licensePlate} (ID: ${this.personas.vehicle.id})`);
    console.log(`💳 Pending Invoice: ${this.personas.pendingInvoice.publicId} (${this.personas.pendingInvoice.amount} IDR)`);
    console.log("================================");
  }

  async run() {
    try {
      this.log("🚀 Starting showcase data seeding...");
      
      await this.cleanSlate();
      await this.createPersonas();
      await this.createBusinessEntities();
      await this.createHistoricalData();
      await this.createBillingState();
      await this.generateSummary();
      
      this.log("🎉 Showcase environment ready!");
    } catch (error) {
      console.error("❌ Seeding failed:", error);
      throw error;
    } finally {
      this.client.close();
    }
  }
}

// Run the seeder
const seeder = new ShowcaseDataSeeder();
seeder.run().catch(process.exit);