#!/usr/bin/env node

// Create test data specifically for public order API verification
async function setupPublicOrderTestData() {
  console.log("Setting up public order verification test data...");

  const API_BASE = process.env.API_BASE || "http://localhost:64517";

  try {
    // Create test data via direct database inserts using wrangler d1 execute
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    console.log("Inserting test data via wrangler d1...");

    const insertSQL = `
-- Insert test users
INSERT OR REPLACE INTO users (id, google_id, email, name) VALUES 
  ('user_mitra_1', 'g_mitra_1', 'mitra1@example.com', 'Ani');

-- Insert test mitra
INSERT OR REPLACE INTO mitras (id, user_id, business_name, business_address, phone_number, subscription_status, active_driver_limit) VALUES 
  ('mitra_1', 'user_mitra_1', 'Katering Lezat Bu Ani', 'Jl. Malang No. 1', '+628123456789', 'active', 10);

-- Insert master payload types
INSERT OR REPLACE INTO master_payload_types (id, name, description) VALUES 
  ('mpt_makanan_panas', 'Makanan Panas', 'Makanan yang perlu dijaga panas');

-- Insert master vehicle types  
INSERT OR REPLACE INTO master_vehicle_types (id, name, description) VALUES 
  ('mvt_motor', 'Motor', 'Sepeda motor untuk pengiriman');

-- Insert test services
INSERT OR REPLACE INTO services (id, mitra_id, name, description, is_public, supported_payload_type_ids, supported_vehicle_type_ids) VALUES 
  ('service_1', 'mitra_1', 'Kurir Makanan Cepat', 'Layanan kurir makanan cepat dan terpercaya', 1, '["mpt_makanan_panas"]', '["mvt_motor"]'),
  ('service_private_1', 'mitra_1', 'Layanan Internal Saja', 'Layanan internal tidak untuk publik', 0, '["mpt_makanan_panas"]', '["mvt_motor"]');

-- Insert services to payload types junction table data
INSERT OR REPLACE INTO services_to_payload_types (service_id, payload_type_id) VALUES 
  ('service_1', 'mpt_makanan_panas');

-- Insert service rates
INSERT OR REPLACE INTO service_rates (service_id, base_fee, fee_per_km) VALUES 
  ('service_1', 5000, 2000);
`;

    const command = `cd ${process.cwd()} && echo "${insertSQL}" | npx wrangler d1 execute treksistem-db-local --local --file=-`;
    await execAsync(command);

    console.log("✅ Test data inserted successfully");

    // Verify data was inserted
    console.log("Verifying test data...");
    const testResponse = await fetch(
      `${API_BASE}/api/public/services?lat=-7.9797&lng=112.6304&payloadTypeId=mpt_makanan_panas`
    );
    const services = await testResponse.json();

    if (services.length > 0) {
      console.log("✅ Service discovery test data verified:", services);
    } else {
      console.log(
        "⚠️  No services found - may need to check junction table setup"
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Error setting up test data:", error.message);
    return false;
  }
}

setupPublicOrderTestData().then(success => {
  if (success) {
    console.log("\n✅ Ready for public order API verification!");
    process.exit(0);
  } else {
    console.log("\n❌ Setup failed");
    process.exit(1);
  }
});
