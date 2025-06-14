#!/usr/bin/env node

/**
 * Direct database test to verify billing system data
 */

const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

async function runQuery(sql) {
  try {
    const { stdout } = await execAsync(
      `wrangler d1 execute treksistem-db-local --local --command="${sql}"`
    );
    const jsonMatch = stdout.match(
      /\[\s*{\s*"results"[\s\S]*?\s*\]\s*(?=\[33m|\s*$)/
    );
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed[0]?.results || [];
    }
    return [];
  } catch (error) {
    console.error(`Query failed: ${sql}`, error.message);
    return [];
  }
}

async function testDatabase() {
  console.log("🔍 Testing Database Setup for QRIS Billing System");
  console.log("=".repeat(60));

  // Test 1: Check users and mitras
  console.log("\n1. User-Mitra Relationships:");
  const users = await runQuery(`
    SELECT u.id, u.email, u.role, m.id as mitra_id, m.business_name, m.subscription_status 
    FROM users u 
    LEFT JOIN mitras m ON u.id = m.user_id 
    ORDER BY u.id;
  `);

  console.table(users);

  // Test 2: Check invoices
  console.log("\n2. Invoice Data:");
  const invoices = await runQuery(`
    SELECT i.id, i.public_id, i.mitra_id, i.type, i.status, i.amount, 
           CASE WHEN i.qris_payload IS NOT NULL THEN 'YES' ELSE 'NO' END as has_qris
    FROM invoices i 
    ORDER BY i.id;
  `);

  console.table(invoices);

  // Test 3: Check drivers and limits
  console.log("\n3. Driver Limits:");
  const driverLimits = await runQuery(`
    SELECT m.id, m.business_name, m.subscription_status, m.active_driver_limit,
           COUNT(d.id) as current_drivers,
           (m.active_driver_limit - COUNT(d.id)) as remaining_slots
    FROM mitras m
    LEFT JOIN drivers d ON m.id = d.mitra_id
    GROUP BY m.id, m.business_name, m.subscription_status, m.active_driver_limit;
  `);

  console.table(driverLimits);

  // Test 4: Verification Summary
  console.log("\n4. Verification Summary:");

  const adminUsers = users.filter(u => u.role === "admin");
  const mitraUsers = users.filter(u => u.mitra_id !== null);
  const pendingInvoices = invoices.filter(i => i.status === "pending");
  const qrisInvoices = invoices.filter(i => i.has_qris === "YES");

  console.log(`✅ Admin users: ${adminUsers.length}`);
  console.log(`✅ Mitra users: ${mitraUsers.length}`);
  console.log(`✅ Total invoices: ${invoices.length}`);
  console.log(`✅ Pending invoices: ${pendingInvoices.length}`);
  console.log(`✅ Invoices with QRIS: ${qrisInvoices.length}`);

  // Test specific verification scenarios
  console.log("\n5. Specific Test Scenarios:");

  const mitra02 = mitraUsers.find(u => u.id === "mitra02");
  if (mitra02) {
    console.log(
      `✅ Mitra02 (${mitra02.business_name}) - Status: ${mitra02.subscription_status}`
    );
  }

  const custInvoice = invoices.find(i => i.public_id === "pub_cust_inv01");
  if (custInvoice) {
    console.log(
      `✅ Customer invoice pub_cust_inv01 - Amount: ${custInvoice.amount}, Type: ${custInvoice.type}`
    );
  }

  const mitra01Limits = driverLimits.find(m => m.id === "mitra01");
  if (mitra01Limits) {
    console.log(
      `✅ Mitra01 driver limits - Current: ${mitra01Limits.current_drivers}/${mitra01Limits.active_driver_limit}`
    );
  }

  console.log("\n📊 Database verification complete!");
}

testDatabase().catch(console.error);
