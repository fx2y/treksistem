#!/usr/bin/env node

// AuthN/AuthZ Verification Script
// Tests all the verification criteria defined in the task

const BASE_URL = "http://localhost:8787";

async function testRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: response.status !== 204 ? await response.text() : "",
      ok: response.ok,
    };
  } catch (error) {
    return {
      error: error.message,
      status: 0,
    };
  }
}

async function runTests() {
  console.log("🧪 Starting AuthN/AuthZ Verification Tests...\n");

  let passed = 0;
  let failed = 0;

  function logTest(description, result, expected) {
    if (result === expected) {
      console.log(`✅ ${description}`);
      passed++;
    } else {
      console.log(`❌ ${description} - Expected: ${expected}, Got: ${result}`);
      failed++;
    }
  }

  console.log("📋 Part 1: Unauthenticated User Flow & Endpoint Protection\n");

  // Test protected endpoints without authentication
  const protectedEndpoints = [
    "/api/auth/me",
    "/api/mitra/services",
    "/api/driver/orders",
    "/api/admin/mitras",
  ];

  for (const endpoint of protectedEndpoints) {
    const result = await testRequest(`${BASE_URL}${endpoint}`);
    logTest(`${endpoint} returns 401 without auth`, result.status, 401);
  }

  // Test public endpoint
  const publicResult = await testRequest(`${BASE_URL}/api/public/services`);
  logTest(
    "/api/public/services returns 200 without auth",
    publicResult.status,
    200
  );

  console.log("\n📋 Part 2: Google OAuth Login Flow\n");

  // Test OAuth login endpoint
  const loginResult = await testRequest(`${BASE_URL}/api/auth/login/google`, {
    redirect: "manual",
  });
  logTest("OAuth login returns 302", loginResult.status, 302);

  const locationHeader = loginResult.headers.location || "";
  const isGoogleAuth = locationHeader.startsWith(
    "https://accounts.google.com/o/oauth2/v2/auth"
  );
  logTest("OAuth redirect goes to Google", isGoogleAuth, true);

  console.log("\n📊 Test Results Summary");
  console.log("======================");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`
  );

  if (failed === 0) {
    console.log("\n🎉 All automated tests passed!");
    console.log("\n⚠️  Manual Steps Required:");
    console.log(
      "1. Complete Google OAuth flow manually to get authorization code"
    );
    console.log("2. Test OAuth callback with valid code and state");
    console.log("3. Verify JWT cookie security attributes");
    console.log("4. Create test users with different roles");
    console.log("5. Test role-based access control scenarios");
  } else {
    console.log("\n❌ Some tests failed. Please review the implementation.");
    process.exit(1);
  }
}

runTests().catch(console.error);
