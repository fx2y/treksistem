#!/usr/bin/env node

const API_BASE = 'http://localhost:8787';

async function setupTestData() {
  console.log('🔧 Setting up test data for verification...\n');

  // Direct database setup via wrangler D1 commands
  console.log('⚙️ Inserting test users...');
  
  // Insert test users
  await execWranglerD1(`
    INSERT OR IGNORE INTO users (id, google_id, email, name)
    VALUES 
      ('user_mitra_1', 'google_mitra_1', 'mitra1@example.com', 'Mitra User 1'),
      ('user_mitra_2', 'google_mitra_2', 'mitra2@example.com', 'Mitra User 2'),
      ('user_driver_1', 'google_driver_1', 'driver1@example.com', 'Driver User 1');
  `);

  console.log('🏢 Inserting test mitras...');
  
  // Insert test mitras
  await execWranglerD1(`
    INSERT OR IGNORE INTO mitras (id, user_id, business_name, subscription_status, active_driver_limit)
    VALUES 
      ('mitra_1', 'user_mitra_1', 'Mitra Test 1', 'active', 10),
      ('mitra_2', 'user_mitra_2', 'Mitra Test 2', 'active', 10);
  `);

  console.log('🚗 Inserting master data...');
  
  // Insert master vehicle types
  await execWranglerD1(`
    INSERT OR IGNORE INTO master_vehicle_types (id, name, icon)
    VALUES 
      ('vehicle_motor', 'Motor', NULL),
      ('v1', 'Motor', NULL);
  `);

  // Insert master payload types
  await execWranglerD1(`
    INSERT OR IGNORE INTO master_payload_types (id, name, icon)
    VALUES 
      ('payload_food', 'Makanan Panas', NULL),
      ('p1', 'Makanan', NULL);
  `);

  // Insert master facilities
  await execWranglerD1(`
    INSERT OR IGNORE INTO master_facilities (id, name, icon)
    VALUES 
      ('f1', 'Box Pendingin', NULL);
  `);

  console.log('📋 Inserting test services...');
  
  // Insert test services for cross-tenant testing
  await execWranglerD1(`
    INSERT OR IGNORE INTO services (id, mitra_id, name, is_public, max_range_km, supported_vehicle_type_ids, supported_payload_type_ids, available_facility_ids)
    VALUES 
      ('service_for_mitra_1', 'mitra_1', 'Layanan Mitra 1', 1, 15, '["vehicle_motor"]', '["payload_food"]', '[]'),
      ('service_for_mitra_2', 'mitra_2', 'Layanan Mitra 2', 1, 20, '["vehicle_motor"]', '["payload_food"]', '[]'),
      ('service_to_update', 'mitra_1', 'Layanan Lama', 1, 15, '["vehicle_motor"]', '["payload_food"]', '[]');
  `);

  console.log('💰 Inserting test service rates...');
  
  // Insert test service rates
  await execWranglerD1(`
    INSERT OR IGNORE INTO service_rates (id, service_id, base_fee, fee_per_km)
    VALUES 
      ('rate_for_mitra_1', 'service_for_mitra_1', 5000, 2000),
      ('rate_for_mitra_2', 'service_for_mitra_2', 6000, 2500),
      ('rate_to_update', 'service_to_update', 5000, 2000);
  `);

  console.log('✅ Test data setup completed!\n');
}

async function execWranglerD1(sql) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    const command = `cd /Users/abdullah/git/fx2y/treksistem/apps/api && wrangler d1 execute treksistem-db-local --command="${sql.replace(/"/g, '\\"')}"`;
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('Warning')) {
      console.error('D1 Error:', stderr);
    }
  } catch (error) {
    console.error('Failed to execute SQL:', error.message);
    console.error('SQL:', sql);
  }
}

setupTestData().catch(console.error);