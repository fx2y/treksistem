import { drizzle } from "drizzle-orm/d1";
import { nanoid } from "nanoid";
import { hash } from "bcryptjs";
import * as schema from "@treksistem/db/schema";

// Mock D1 database for local development
const mockD1 = {
  exec: () => Promise.resolve({ results: [], success: true }),
  prepare: query => ({
    bind: (...args) => ({
      all: () => Promise.resolve({ results: [], success: true }),
      run: () => Promise.resolve({ results: [], success: true }),
      get: () => Promise.resolve({ results: [], success: true }),
      first: () => Promise.resolve(null),
    }),
  }),
};

const db = drizzle(mockD1, { schema });

const seedData = {
  users: [
    {
      id: nanoid(),
      publicId: nanoid(),
      googleId: "admin_google_id",
      email: "admin@treksistem.com",
      name: "System Administrator",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: nanoid(),
      publicId: nanoid(),
      googleId: "mitra1_google_id",
      email: "mitra1@example.com",
      name: "Mitra Satu",
      role: "mitra",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: nanoid(),
      publicId: nanoid(),
      googleId: "driver1_google_id",
      email: "driver1@example.com",
      name: "Driver Satu",
      role: "driver",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],

  mitras: [
    {
      id: nanoid(),
      publicId: nanoid(),
      ownerId: "", // Will be set to mitra user ID
      name: "Warung Makan Sederhana",
      businessType: "restaurant",
      phone: "08123456789",
      address: "Jl. Merdeka No. 123, Malang",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],

  services: [
    {
      id: nanoid(),
      publicId: nanoid(),
      mitraId: "", // Will be set to mitra ID
      name: "Antar Makanan",
      description: "Layanan antar makanan untuk wilayah Malang",
      payloadTypeId: "food",
      maxWeight: 5,
      maxVolume: 10,
      pricePerKm: 2000,
      baseFare: 5000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],

  drivers: [
    {
      id: nanoid(),
      publicId: nanoid(),
      userId: "", // Will be set to driver user ID
      mitraId: "", // Will be set to mitra ID
      phone: "08123456780",
      licenseNumber: "D1234567890",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],

  vehicles: [
    {
      id: nanoid(),
      publicId: nanoid(),
      mitraId: "", // Will be set to mitra ID
      licensePlate: "N1234ABC",
      description: "Honda Vario 125",
      maxWeight: 5,
      maxVolume: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Set up relationships
    const mitraUser = seedData.users.find(u => u.role === "mitra");
    const driverUser = seedData.users.find(u => u.role === "driver");
    const mitra = seedData.mitras[0];
    const service = seedData.services[0];
    const driver = seedData.drivers[0];
    const vehicle = seedData.vehicles[0];

    // Link mitra to user
    mitra.ownerId = mitraUser.id;
    service.mitraId = mitra.id;
    driver.userId = driverUser.id;
    driver.mitraId = mitra.id;
    vehicle.mitraId = mitra.id;

    // Insert users
    console.log("👤 Seeding users...");
    for (const user of seedData.users) {
      try {
        await db.insert(schema.users).values(user);
        console.log(`✅ Created user: ${user.name} (${user.email})`);
      } catch (error) {
        console.log(`⚠️ User ${user.email} may already exist`);
      }
    }

    // Insert mitras
    console.log("🏢 Seeding mitras...");
    for (const mitraData of seedData.mitras) {
      try {
        await db.insert(schema.mitras).values(mitraData);
        console.log(`✅ Created mitra: ${mitraData.name}`);
      } catch (error) {
        console.log(`⚠️ Mitra ${mitraData.name} may already exist`);
      }
    }

    // Insert services
    console.log("🚚 Seeding services...");
    for (const serviceData of seedData.services) {
      try {
        await db.insert(schema.services).values(serviceData);
        console.log(`✅ Created service: ${serviceData.name}`);
      } catch (error) {
        console.log(`⚠️ Service ${serviceData.name} may already exist`);
      }
    }

    // Insert drivers
    console.log("🚗 Seeding drivers...");
    for (const driverData of seedData.drivers) {
      try {
        await db.insert(schema.drivers).values(driverData);
        console.log(`✅ Created driver: ${driverData.phone}`);
      } catch (error) {
        console.log(`⚠️ Driver ${driverData.phone} may already exist`);
      }
    }

    // Insert vehicles
    console.log("🚙 Seeding vehicles...");
    for (const vehicleData of seedData.vehicles) {
      try {
        await db.insert(schema.vehicles).values(vehicleData);
        console.log(`✅ Created vehicle: ${vehicleData.licensePlate}`);
      } catch (error) {
        console.log(`⚠️ Vehicle ${vehicleData.licensePlate} may already exist`);
      }
    }

    console.log("🎉 Database seeding completed successfully!");
    console.log("");
    console.log("📋 Seeded data summary:");
    console.log(`- ${seedData.users.length} users (admin, mitra, driver)`);
    console.log(`- ${seedData.mitras.length} mitra business`);
    console.log(`- ${seedData.services.length} service`);
    console.log(`- ${seedData.drivers.length} driver`);
    console.log(`- ${seedData.vehicles.length} vehicle`);
    console.log("");
    console.log("🔑 Login credentials:");
    console.log("Admin: admin@treksistem.com");
    console.log("Mitra: mitra1@example.com");
    console.log("Driver: driver1@example.com");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export { seedDatabase };
