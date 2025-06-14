#!/usr/bin/env node

import jwt from "jsonwebtoken";

const API_BASE = "http://localhost:8787";
const JWT_SECRET = "test-jwt-secret-32-characters-long-string-for-verification";

// Create a token for our test user
const testToken = jwt.sign({ userId: "user_mitra_1" }, JWT_SECRET, {
  expiresIn: "1h",
});

console.log("Generated token:", testToken);
console.log("\nDecoded token:", jwt.verify(testToken, JWT_SECRET));

// Test different authentication methods
const testCalls = [
  {
    name: "Root endpoint (no auth)",
    endpoint: "/",
    headers: {},
  },
  {
    name: "Mitra drivers endpoint (Authorization header)",
    endpoint: "/api/mitra/drivers",
    headers: { Authorization: `Bearer ${testToken}` },
  },
  {
    name: "Auth me endpoint (Authorization header)",
    endpoint: "/api/auth/me",
    headers: { Authorization: `Bearer ${testToken}` },
  },
  {
    name: "Mitra drivers endpoint (Cookie)",
    endpoint: "/api/mitra/drivers",
    headers: { Cookie: `access_token=${testToken}` },
  },
];

async function testAuth() {
  for (const test of testCalls) {
    try {
      console.log(`\n--- ${test.name} ---`);
      const response = await fetch(`${API_BASE}${test.endpoint}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...test.headers,
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      console.log(`Status: ${response.status}`);
      console.log(`Response:`, data);
    } catch (error) {
      console.log(`Error:`, error.message);
    }
  }
}

testAuth().catch(console.error);
