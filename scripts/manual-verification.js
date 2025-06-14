#!/usr/bin/env node

import jwt from "jsonwebtoken";

// Configuration
const API_BASE = "http://localhost:8787";
const JWT_SECRET = "test-jwt-secret-32-characters-long-string";

// Helper to make API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      parsed = data;
    }

    return { status: response.status, data: parsed };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

async function runVerification() {
  // Step 1: Check if server is running
  console.log("Step 1: Checking API server...");
  const serverCheck = await apiCall("/");
  if (serverCheck.status !== 200) {
    console.log("❌ API server is not running");
    process.exit(1);
  }
  console.log("✅ API server is running");

  // Step 2: Create test users and mitras manually via SQL
  console.log("\nStep 2: Setting up test data manually...");

  // For this manual verification, we'll create simple tokens and see what happens
  const testTokens = {
    mitra1: jwt.sign({ userId: "user_mitra_1" }, JWT_SECRET, {
      expiresIn: "1h",
    }),
    driver1: jwt.sign({ userId: "user_driver_1" }, JWT_SECRET, {
      expiresIn: "1h",
    }),
  };

  console.log("Generated test tokens");

  // Step 3: Test authentication by hitting a protected endpoint
  console.log("\nStep 3: Testing authentication...");

  const authTest = await apiCall("/api/mitra/drivers", {
    method: "GET",
    headers: { Authorization: `Bearer ${testTokens.mitra1}` },
  });

  console.log(`Auth test result: ${authTest.status}`, authTest.data);

  if (authTest.status === 401) {
    console.log(
      "\n🔍 Authentication failed - need to create users in database first"
    );

    // Test if we can at least parse the JWT
    try {
      const decoded = jwt.verify(testTokens.mitra1, JWT_SECRET);
      console.log("✅ JWT token is valid:", decoded);
      console.log("❌ But user_mitra_1 does not exist in database");
    } catch (error) {
      console.log("❌ JWT token is invalid:", error.message);
    }
  } else if (authTest.status === 403) {
    console.log("✅ Authentication worked but user is not a mitra");
  } else if (authTest.status === 200) {
    console.log("🎉 Authentication and authorization working!");
  } else {
    console.log("🤔 Unexpected response:", authTest.status, authTest.data);
  }

  // Step 4: Let's test what endpoints are available
  console.log("\nStep 4: Testing available endpoints...");

  const endpoints = ["/", "/api/auth/me", "/api/public/health"];

  for (const endpoint of endpoints) {
    const result = await apiCall(endpoint);
    console.log(`${endpoint}: ${result.status}`);
  }

  console.log("\n=== Manual Verification Summary ===");
  console.log("1. API server is running ✅");
  console.log("2. JWT tokens can be generated ✅");
  console.log("3. Authentication requires users in database ❌");
  console.log("4. Need to create test data first");

  console.log("\n📝 Next Steps:");
  console.log("1. Create users table entries for user_mitra_1, user_driver_1");
  console.log("2. Create mitras table entry linking user_mitra_1 to mitra_1");
  console.log("3. Re-run verification tests");

  // Let's try to create the data directly with a simple SQL approach if possible
  console.log("\n🔧 Attempting to check database structure...");

  // Check if there are any existing endpoints that might help us understand the data structure
  const adminEndpoints = ["/api/admin/mitras", "/api/admin/test-data/setup"];

  for (const endpoint of adminEndpoints) {
    const result = await apiCall(endpoint, {
      headers: {
        Authorization: `Bearer ${jwt.sign({ userId: "admin" }, JWT_SECRET)}`,
      },
    });
    console.log(
      `${endpoint}: ${result.status} - ${JSON.stringify(result.data).slice(0, 100)}...`
    );
  }
}

runVerification().catch(console.error);
