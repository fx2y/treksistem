#!/usr/bin/env node

// Detailed OAuth and Cookie Security Tests
const BASE_URL = "http://localhost:8787";

async function testOAuthFlow() {
  console.log("🔐 Testing OAuth Flow Details...\n");

  // Test 1: OAuth Login Redirect Details
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login/google`, {
    redirect: "manual",
  });

  console.log("📍 OAuth Login Response:");
  console.log(`Status: ${loginResponse.status}`);
  console.log(`Location: ${loginResponse.headers.get("location")}`);

  const setCookieHeaders = loginResponse.headers.get("set-cookie") || "";
  console.log(`Set-Cookie: ${setCookieHeaders}`);

  // Parse cookies for security attributes
  const cookies = setCookieHeaders.split(",").map(c => c.trim());

  cookies.forEach(cookie => {
    if (
      cookie.includes("oauth_state") ||
      cookie.includes("oauth_code_verifier")
    ) {
      console.log(`\n🍪 Cookie Analysis: ${cookie.split(";")[0]}`);
      console.log(`- HttpOnly: ${cookie.includes("HttpOnly")}`);
      console.log(`- Secure: ${cookie.includes("Secure")}`);
      console.log(
        `- SameSite: ${cookie.includes("SameSite=Lax") ? "Lax" : cookie.includes("SameSite=Strict") ? "Strict" : "None/Missing"}`
      );
    }
  });

  // Test 2: OAuth Callback with Invalid Data
  console.log("\n📥 Testing OAuth Callback with Invalid Data:");

  const invalidCallbackResponse = await fetch(
    `${BASE_URL}/api/auth/callback/google?code=invalid&state=invalid`
  );
  console.log(`Invalid callback status: ${invalidCallbackResponse.status}`);

  if (invalidCallbackResponse.status === 400) {
    const errorBody = await invalidCallbackResponse.text();
    console.log(`Error response: ${errorBody}`);
  }

  // Test 3: Missing Environment Variables Check
  console.log("\n🔧 Environment Variables Check:");
  console.log(
    "For OAuth to work, these environment variables must be set in wrangler.toml:"
  );
  console.log("- GOOGLE_CLIENT_ID");
  console.log("- GOOGLE_CLIENT_SECRET");
  console.log("- JWT_SECRET (32+ characters)");
  console.log(
    "- GOOGLE_REDIRECT_URI (optional, defaults to localhost:8787/api/auth/callback/google)"
  );
}

testOAuthFlow().catch(console.error);
