#!/usr/bin/env node

const crypto = require("crypto");

// JWT Secret from wrangler.toml
const JWT_SECRET = "test-jwt-secret-32-characters-long-string-for-verification";

// Generate proper JWT tokens for testing
function createJWT(payload) {
  const header = { alg: "HS256", typ: "JWT" };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24, // 24 hours for testing
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString(
    "base64url"
  );

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Generate test tokens
const MITRA_1_TOKEN = createJWT({ userId: "user_mitra_1" });
const MITRA_2_TOKEN = createJWT({ userId: "user_mitra_2" });
const DRIVER_1_TOKEN = createJWT({ userId: "user_driver_1" });
const NON_MITRA_TOKEN = createJWT({ userId: "user_regular_1" });

console.log("🔑 JWT Test Tokens Generated\n");
console.log("📋 Copy these tokens for API testing:\n");

console.log("✅ MITRA USER TOKEN (user_mitra_1):");
console.log(MITRA_1_TOKEN);
console.log("\n");

console.log("✅ SECOND MITRA TOKEN (user_mitra_2):");
console.log(MITRA_2_TOKEN);
console.log("\n");

console.log("❌ NON-MITRA USER TOKEN (403 testing):");
console.log(DRIVER_1_TOKEN);
console.log("\n");

console.log("❌ REGULAR USER TOKEN (403 testing):");
console.log(NON_MITRA_TOKEN);
console.log("\n");

console.log("📝 Usage Examples:");
console.log("\n# Test Mitra Service API with valid token:");
console.log(
  'curl -H "Authorization: Bearer ' +
    MITRA_1_TOKEN +
    '" http://localhost:8787/api/mitra/services'
);
console.log("\n# Test 403 response with driver token:");
console.log(
  'curl -H "Authorization: Bearer ' +
    DRIVER_1_TOKEN +
    '" http://localhost:8787/api/mitra/services'
);
console.log("\n# Create new service:");
console.log(
  'curl -X POST -H "Authorization: Bearer ' +
    MITRA_1_TOKEN +
    '" -H "Content-Type: application/json" -d \'{"name":"Test Service","isPublic":true,"maxRangeKm":20,"supportedVehicleTypeIds":["vehicle_motor"],"supportedPayloadTypeIds":["payload_food"],"rate":{"baseFee":5000,"feePerKm":2000}}\' http://localhost:8787/api/mitra/services'
);
