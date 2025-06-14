const crypto = require("crypto");

// Simple JWT implementation for testing
function createJWT(payload, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

const JWT_SECRET = "test-jwt-secret-32-characters-long-string-for-verification";
const API_BASE = "http://localhost:59946";

// Generate tokens for testing
const mitra1Token = createJWT({ userId: "user_mitra_1" }, JWT_SECRET);
const driver1Token = createJWT({ userId: "user_driver_1" }, JWT_SECRET);

console.log("Generated Tokens:");
console.log("Mitra 1:", mitra1Token);
console.log("Driver 1:", driver1Token);

async function testAPI() {
  console.log("\n🔍 Testing Driver Management API");
  console.log("==================================");

  try {
    // Test 1: Create invitation
    console.log("\n1. Testing invitation creation...");
    const inviteResponse = await fetch(`${API_BASE}/api/mitra/drivers/invite`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mitra1Token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "driver1@example.com" }),
    });

    if (inviteResponse.ok) {
      const inviteData = await inviteResponse.json();
      console.log("✅ PASS: Invitation created");
      console.log("Response:", JSON.stringify(inviteData, null, 2));

      // Extract token from invite link
      const inviteUrl = new URL(inviteData.inviteLink);
      const inviteToken = inviteUrl.searchParams.get("token");

      if (inviteToken) {
        console.log(
          `✅ PASS: Token extracted: ${inviteToken.substring(0, 10)}...`
        );

        // Test 2: Accept invitation
        console.log("\n2. Testing invitation acceptance...");
        const acceptResponse = await fetch(
          `${API_BASE}/api/public/invites/accept`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${driver1Token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: inviteToken }),
          }
        );

        if (acceptResponse.ok) {
          const acceptData = await acceptResponse.json();
          console.log("✅ PASS: Invitation accepted");
          console.log("Response:", JSON.stringify(acceptData, null, 2));

          // Test 3: List drivers
          console.log("\n3. Testing driver listing...");
          const listResponse = await fetch(`${API_BASE}/api/mitra/drivers`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${mitra1Token}`,
            },
          });

          if (listResponse.ok) {
            const listData = await listResponse.json();
            console.log("✅ PASS: Drivers listed");
            console.log("Response:", JSON.stringify(listData, null, 2));

            if (listData.length > 0 && listData[0].id) {
              const driverId = listData[0].id;

              // Test 4: Remove driver
              console.log("\n4. Testing driver removal...");
              const removeResponse = await fetch(
                `${API_BASE}/api/mitra/drivers/${driverId}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${mitra1Token}`,
                  },
                }
              );

              if (removeResponse.status === 204) {
                console.log("✅ PASS: Driver removed successfully");

                // Test 5: Verify empty list
                console.log("\n5. Verifying empty driver list...");
                const emptyListResponse = await fetch(
                  `${API_BASE}/api/mitra/drivers`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${mitra1Token}`,
                    },
                  }
                );

                if (emptyListResponse.ok) {
                  const emptyListData = await emptyListResponse.json();
                  if (
                    Array.isArray(emptyListData) &&
                    emptyListData.length === 0
                  ) {
                    console.log("✅ PASS: Driver list is empty after removal");
                    console.log("\n🎉 ALL CORE TESTS PASSED!");
                  } else {
                    console.log("❌ FAIL: Driver list should be empty");
                  }
                }
              } else {
                console.log(
                  `❌ FAIL: Driver removal failed with status ${removeResponse.status}`
                );
              }
            }
          } else {
            console.log(
              `❌ FAIL: Driver listing failed with status ${listResponse.status}`
            );
          }
        } else {
          console.log(
            `❌ FAIL: Invitation acceptance failed with status ${acceptResponse.status}`
          );
          const errorText = await acceptResponse.text();
          console.log("Error:", errorText);
        }
      }
    } else {
      console.log(
        `❌ FAIL: Invitation creation failed with status ${inviteResponse.status}`
      );
      const errorText = await inviteResponse.text();
      console.log("Error:", errorText);
    }
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

testAPI();
