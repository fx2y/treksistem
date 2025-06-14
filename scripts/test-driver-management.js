const jwt = require("jsonwebtoken");

// Test configuration
const API_BASE = "http://localhost:8787";
const JWT_SECRET = "test-jwt-secret-32-characters-long-string";

// Test data - use specific IDs that would be created by setup
const testMitraUser = {
  userId: "user_mitra_1",
};

const testDriverUser = {
  userId: "user_driver_1",
};

// Generate test JWTs
function generateToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

// Test functions
async function testInviteDriver() {
  console.log("\n=== Testing Driver Invitation ===");

  const mitraToken = generateToken(testMitraUser);

  try {
    const response = await fetch(`${API_BASE}/api/mitra/drivers/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mitraToken}`,
      },
      body: JSON.stringify({
        email: "driver@test.com",
      }),
    });

    console.log("Status:", response.status);
    const result = await response.json();
    console.log("Response:", result);

    if (result.inviteLink) {
      console.log("✅ Invitation created successfully");
      return result.inviteLink;
    } else {
      console.log("❌ Invitation failed");
      return null;
    }
  } catch (error) {
    console.error("❌ Error testing invitation:", error.message);
    return null;
  }
}

async function testAcceptInvite(inviteLink) {
  if (!inviteLink) {
    console.log("❌ No invite link to test");
    return;
  }

  console.log("\n=== Testing Invitation Acceptance ===");

  const driverToken = generateToken(testDriverUser);
  const token = new URL(inviteLink).searchParams.get("token");

  try {
    const response = await fetch(`${API_BASE}/api/public/invites/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        token: token,
      }),
    });

    console.log("Status:", response.status);
    const result = await response.json();
    console.log("Response:", result);

    if (result.mitraName) {
      console.log("✅ Invitation accepted successfully");
    } else {
      console.log("❌ Invitation acceptance failed");
    }
  } catch (error) {
    console.error("❌ Error testing invitation acceptance:", error.message);
  }
}

async function testListDrivers() {
  console.log("\n=== Testing List Drivers ===");

  const mitraToken = generateToken(testMitraUser);

  try {
    const response = await fetch(`${API_BASE}/api/mitra/drivers`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${mitraToken}`,
      },
    });

    console.log("Status:", response.status);
    const result = await response.json();
    console.log("Response:", result);

    if (Array.isArray(result)) {
      console.log("✅ Drivers list retrieved successfully");
      console.log(`Found ${result.length} drivers`);
    } else {
      console.log("❌ Failed to retrieve drivers list");
    }
  } catch (error) {
    console.error("❌ Error testing drivers list:", error.message);
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting Driver Management API Tests");
  console.log("API Base:", API_BASE);

  const inviteLink = await testInviteDriver();
  await testAcceptInvite(inviteLink);
  await testListDrivers();

  console.log("\n✅ Driver Management API tests completed");
}

runTests().catch(console.error);
