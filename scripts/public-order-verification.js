#!/usr/bin/env node

// Comprehensive verification script for Public Order Creation & Tracking API
const API_BASE = process.env.API_BASE || "http://localhost:8787";

let testResults = [];
let createdPublicId = null;
let createdNotificationLogId = null;

function logTest(test, status, details = "") {
  const result = { test, status, details };
  testResults.push(result);
  console.log(
    `${status === "PASS" ? "✅" : "❌"} ${test}${details ? ": " + details : ""}`
  );
}

async function testServiceDiscovery() {
  console.log("\n=== 1. Service Discovery Endpoint Tests ===");

  try {
    // Test 1: Successful discovery
    const response1 = await fetch(
      `${API_BASE}/api/public/services?lat=-7.9797&lng=112.6304&payloadTypeId=mpt_makanan_panas`
    );
    logTest(
      "Service discovery returns HTTP 200",
      response1.status === 200 ? "PASS" : "FAIL",
      `Status: ${response1.status}`
    );

    const services = await response1.json();
    const hasExpectedService = services.some(
      s =>
        s.serviceId === "service_1" && s.mitraName === "Katering Lezat Bu Ani"
    );
    logTest(
      "Response contains expected service",
      hasExpectedService ? "PASS" : "FAIL",
      JSON.stringify(services)
    );

    // Test 2: Unsupported payload type
    const response2 = await fetch(
      `${API_BASE}/api/public/services?lat=-7.9797&lng=112.6304&payloadTypeId=mpt_barang_elektronik`
    );
    logTest(
      "Unsupported payload type returns HTTP 200",
      response2.status === 200 ? "PASS" : "FAIL",
      `Status: ${response2.status}`
    );

    const emptyServices = await response2.json();
    logTest(
      "Unsupported payload type returns empty array",
      Array.isArray(emptyServices) && emptyServices.length === 0
        ? "PASS"
        : "FAIL",
      JSON.stringify(emptyServices)
    );

    // Test 3: Invalid parameters
    const response3 = await fetch(
      `${API_BASE}/api/public/services?lat=invalid&lng=112.6304&payloadTypeId=mpt_makanan_panas`
    );
    logTest(
      "Invalid parameters return HTTP 400",
      response3.status === 400 ? "PASS" : "FAIL",
      `Status: ${response3.status}`
    );
  } catch (error) {
    logTest("Service discovery tests", "FAIL", error.message);
  }
}

async function testPriceQuoting() {
  console.log("\n=== 2. Price Quoting Endpoint Tests ===");

  try {
    // Test 1: Successful quote
    const response1 = await fetch(`${API_BASE}/api/public/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: "service_1",
        stops: [
          {
            address: "Alun-Alun Tugu",
            lat: -7.9797,
            lng: 112.6304,
            type: "pickup",
          },
          {
            address: "Universitas Brawijaya",
            lat: -7.9539,
            lng: 112.6145,
            type: "dropoff",
          },
        ],
      }),
    });
    logTest(
      "Quote request returns HTTP 200",
      response1.status === 200 ? "PASS" : "FAIL",
      `Status: ${response1.status}`
    );

    const quote = await response1.json();
    const validQuote =
      quote.estimatedCost > 10000 &&
      quote.totalDistanceKm >= 3.0 &&
      quote.totalDistanceKm <= 3.2;
    logTest(
      "Quote contains valid cost and distance",
      validQuote ? "PASS" : "FAIL",
      JSON.stringify(quote)
    );

    // Test 2: Non-existent service
    const response2 = await fetch(`${API_BASE}/api/public/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: "non_existent_service",
        stops: [
          {
            address: "Alun-Alun Tugu",
            lat: -7.9797,
            lng: 112.6304,
            type: "pickup",
          },
          {
            address: "Universitas Brawijaya",
            lat: -7.9539,
            lng: 112.6145,
            type: "dropoff",
          },
        ],
      }),
    });
    logTest(
      "Non-existent service returns HTTP 404",
      response2.status === 404 ? "PASS" : "FAIL",
      `Status: ${response2.status}`
    );

    // Test 3: Private service
    const response3 = await fetch(`${API_BASE}/api/public/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: "service_private_1",
        stops: [
          {
            address: "Alun-Alun Tugu",
            lat: -7.9797,
            lng: 112.6304,
            type: "pickup",
          },
          {
            address: "Universitas Brawijaya",
            lat: -7.9539,
            lng: 112.6145,
            type: "dropoff",
          },
        ],
      }),
    });
    logTest(
      "Private service returns HTTP 404",
      response3.status === 404 ? "PASS" : "FAIL",
      `Status: ${response3.status}`
    );

    // Test 4: Malformed stops
    const response4 = await fetch(`${API_BASE}/api/public/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: "service_1",
        stops: [{ address: "Incomplete", lat: -7.9797 }],
      }),
    });
    logTest(
      "Malformed stops return HTTP 400",
      response4.status === 400 ? "PASS" : "FAIL",
      `Status: ${response4.status}`
    );
  } catch (error) {
    logTest("Price quoting tests", "FAIL", error.message);
  }
}

async function testOrderCreation() {
  console.log("\n=== 3. Order Creation Endpoint Tests ===");

  const orderCreationRequest = {
    serviceId: "service_1",
    ordererName: "Budi Pelanggan",
    ordererPhone: "081234567890",
    recipientName: "Siti Penerima",
    recipientPhone: "089876543210",
    notes: "Tolong taruh di resepsionis",
    stops: [
      {
        address: "Alun-Alun Tugu Malang",
        lat: -7.9797,
        lng: 112.6304,
        type: "pickup",
      },
      {
        address: "Universitas Brawijaya",
        lat: -7.9539,
        lng: 112.6145,
        type: "dropoff",
      },
    ],
  };

  try {
    // Test 1: Successful order creation
    const response1 = await fetch(`${API_BASE}/api/public/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderCreationRequest),
    });
    logTest(
      "Order creation returns HTTP 201",
      response1.status === 201 ? "PASS" : "FAIL",
      `Status: ${response1.status}`
    );

    const order = await response1.json();
    const hasPublicId =
      order.publicId &&
      order.publicId.length >= 16 &&
      order.publicId.length <= 24;
    logTest(
      "Response contains valid publicId",
      hasPublicId ? "PASS" : "FAIL",
      `publicId: ${order.publicId}`
    );

    const hasTrackingUrl =
      order.trackingUrl && order.trackingUrl.endsWith(order.publicId);
    logTest(
      "Response contains valid trackingUrl",
      hasTrackingUrl ? "PASS" : "FAIL",
      `trackingUrl: ${order.trackingUrl}`
    );

    const hasNotificationLogId =
      order.notificationLogId && order.notificationLogId.length > 0;
    logTest(
      "Response contains notificationLogId",
      hasNotificationLogId ? "PASS" : "FAIL",
      `notificationLogId: ${order.notificationLogId}`
    );

    // Store for later tests
    createdPublicId = order.publicId;
    createdNotificationLogId = order.notificationLogId;

    // Test 2: Missing ordererName
    const invalidRequest = { ...orderCreationRequest };
    delete invalidRequest.ordererName;
    const response2 = await fetch(`${API_BASE}/api/public/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidRequest),
    });
    logTest(
      "Missing ordererName returns HTTP 400",
      response2.status === 400 ? "PASS" : "FAIL",
      `Status: ${response2.status}`
    );

    // Test 3: Non-existent service
    const invalidServiceRequest = {
      ...orderCreationRequest,
      serviceId: "non_existent_service",
    };
    const response3 = await fetch(`${API_BASE}/api/public/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidServiceRequest),
    });
    logTest(
      "Non-existent service returns HTTP 404",
      response3.status === 404 ? "PASS" : "FAIL",
      `Status: ${response3.status}`
    );
  } catch (error) {
    logTest("Order creation tests", "FAIL", error.message);
  }
}

async function testOrderTracking() {
  console.log("\n=== 4. Order Tracking Endpoint Tests ===");

  if (!createdPublicId) {
    logTest("Order tracking tests", "SKIP", "No publicId from order creation");
    return;
  }

  try {
    // Test 1: Successful tracking
    const response1 = await fetch(
      `${API_BASE}/api/public/track/${createdPublicId}`
    );
    logTest(
      "Order tracking returns HTTP 200",
      response1.status === 200 ? "PASS" : "FAIL",
      `Status: ${response1.status}`
    );

    const tracking = await response1.json();
    logTest(
      "Tracking response contains matching publicId",
      tracking.publicId === createdPublicId ? "PASS" : "FAIL",
      `Expected: ${createdPublicId}, Got: ${tracking.publicId}`
    );

    logTest(
      "Tracking response has pending_dispatch status",
      tracking.status === "pending_dispatch" ? "PASS" : "FAIL",
      `Status: ${tracking.status}`
    );

    const hasTwoStops =
      Array.isArray(tracking.stops) && tracking.stops.length === 2;
    logTest(
      "Tracking response has 2 stops",
      hasTwoStops ? "PASS" : "FAIL",
      `Stops count: ${tracking.stops?.length}`
    );

    const firstStopValid =
      tracking.stops &&
      tracking.stops[0] &&
      tracking.stops[0].sequence === 1 &&
      tracking.stops[0].address === "Alun-Alun Tugu Malang";
    logTest(
      "First stop has correct data",
      firstStopValid ? "PASS" : "FAIL",
      JSON.stringify(tracking.stops?.[0])
    );

    const hasEmptyReports =
      Array.isArray(tracking.reports) && tracking.reports.length === 0;
    logTest(
      "Tracking response has empty reports array",
      hasEmptyReports ? "PASS" : "FAIL",
      `Reports: ${JSON.stringify(tracking.reports)}`
    );

    // Test 2: Non-existent order
    const response2 = await fetch(
      `${API_BASE}/api/public/track/non-existent-id`
    );
    logTest(
      "Non-existent order returns HTTP 404",
      response2.status === 404 ? "PASS" : "FAIL",
      `Status: ${response2.status}`
    );
  } catch (error) {
    logTest("Order tracking tests", "FAIL", error.message);
  }
}

async function testRateLimiting() {
  console.log("\n=== 5. Rate Limiting Tests ===");

  try {
    // Wait a moment for rate limit to reset
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Make 19 requests (should succeed under new limit of 20/60s)
    const requests = [];
    for (let i = 0; i < 19; i++) {
      requests.push(
        fetch(
          `${API_BASE}/api/public/services?lat=-7.9797&lng=112.6304&payloadTypeId=mpt_makanan_panas`
        )
      );
    }

    const responses = await Promise.all(requests);
    const allSuccess = responses.every(r => r.status === 200);
    logTest(
      "First 19 requests succeed (HTTP 200)",
      allSuccess ? "PASS" : "FAIL",
      `Status codes: ${responses.map(r => r.status).join(", ")}`
    );

    // 20th and 21st requests should be rate limited
    const response20 = await fetch(
      `${API_BASE}/api/public/services?lat=-7.9797&lng=112.6304&payloadTypeId=mpt_makanan_panas`
    );
    const response21 = await fetch(
      `${API_BASE}/api/public/services?lat=-7.9797&lng=112.6304&payloadTypeId=mpt_makanan_panas`
    );
    logTest(
      "20th request succeeds",
      response20.status === 200 ? "PASS" : "FAIL",
      `Status: ${response20.status}`
    );
    logTest(
      "21st request is rate limited (HTTP 429)",
      response21.status === 429 ? "PASS" : "FAIL",
      `Status: ${response21.status}`
    );
  } catch (error) {
    logTest("Rate limiting tests", "FAIL", error.message);
  }
}

async function runAllTests() {
  console.log("🚀 Starting Public Order API Verification...\n");

  await testServiceDiscovery();
  await testPriceQuoting();
  await testOrderCreation();
  await testOrderTracking();
  await testRateLimiting();

  console.log("\n=== VERIFICATION SUMMARY ===");
  const passed = testResults.filter(r => r.status === "PASS").length;
  const failed = testResults.filter(r => r.status === "FAIL").length;
  const skipped = testResults.filter(r => r.status === "SKIP").length;

  console.log(`✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`⏭️  SKIPPED: ${skipped}`);
  console.log(`📊 TOTAL: ${testResults.length}`);

  if (failed === 0) {
    console.log(
      "\n🎉 ALL TESTS PASSED! Public Order API verification successful."
    );
    return true;
  } else {
    console.log("\n💥 SOME TESTS FAILED. Please review the results above.");
    console.log("\nFailed tests:");
    testResults
      .filter(r => r.status === "FAIL")
      .forEach(r => {
        console.log(`  - ${r.test}: ${r.details}`);
      });
    return false;
  }
}

// Run the verification
runAllTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("❌ Verification failed with error:", error.message);
    process.exit(1);
  });
