#!/usr/bin/env node
/**
 * Simple E2E smoke test for core API functionality
 * Tests basic endpoints to ensure the system is working
 */

import fetch from "node-fetch";

const API_BASE = process.env.API_BASE || "http://localhost:8787";
const TEST_TIMEOUT = 10000; // 10 seconds

class SmokeTest {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, testFn) {
    console.log(`🧪 Running: ${name}`);
    const start = Date.now();

    try {
      await Promise.race([
        testFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Test timeout")), TEST_TIMEOUT)
        ),
      ]);

      const duration = Date.now() - start;
      console.log(`✅ PASS: ${name} (${duration}ms)`);
      this.results.push({ name, status: "PASS", duration });
      this.passed++;
    } catch (error) {
      const duration = Date.now() - start;
      console.log(`❌ FAIL: ${name} (${duration}ms) - ${error.message}`);
      this.results.push({
        name,
        status: "FAIL",
        duration,
        error: error.message,
      });
      this.failed++;
    }
  }

  async makeRequest(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      data: response.headers.get("content-type")?.includes("json")
        ? await response.json()
        : await response.text(),
    };
  }

  async runTests() {
    console.log("🚀 Starting E2E Smoke Tests");
    console.log(`📍 API Base: ${API_BASE}`);
    console.log("=" * 50);

    // Test 1: Health check
    await this.test("API Health Check", async () => {
      const response = await this.makeRequest("/health");
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      if (!response.data.status || response.data.status !== "ok") {
        throw new Error("Health check failed");
      }
    });

    // Test 2: Test endpoint
    await this.test("Test Endpoint", async () => {
      const response = await this.makeRequest("/api/test");
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
    });

    // Test 3: Public services endpoint
    await this.test("Public Services Endpoint", async () => {
      const response = await this.makeRequest("/api/public/services");
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      if (!Array.isArray(response.data)) {
        throw new Error("Expected services array");
      }
    });

    // Test 4: Quote endpoint (should handle missing data gracefully)
    await this.test("Quote Endpoint Error Handling", async () => {
      const response = await this.makeRequest("/api/public/quote", {
        method: "POST",
        body: JSON.stringify({}),
      });
      // Should return 400 for invalid input
      if (response.status !== 400) {
        throw new Error(
          `Expected 400 for invalid input, got ${response.status}`
        );
      }
    });

    // Test 5: Auth endpoints without credentials
    await this.test("Protected Endpoint Auth Check", async () => {
      const response = await this.makeRequest("/api/mitra/profile");
      // Should return 401 unauthorized
      if (response.status !== 401) {
        throw new Error(
          `Expected 401 for protected endpoint, got ${response.status}`
        );
      }
    });

    // Test 6: Static file serving (if applicable)
    await this.test("Static Assets", async () => {
      const response = await this.makeRequest("/favicon.ico");
      // Should either return 200 or 404, but not 500
      if (response.status >= 500) {
        throw new Error(`Server error for static asset: ${response.status}`);
      }
    });

    this.printResults();
  }

  printResults() {
    console.log("\n" + "=" * 50);
    console.log("📊 E2E Smoke Test Results");
    console.log("=" * 50);

    this.results.forEach(result => {
      const status = result.status === "PASS" ? "✅" : "❌";
      const duration = `${result.duration}ms`;
      console.log(
        `${status} ${result.name.padEnd(30)} ${duration.padStart(8)}`
      );
      if (result.error) {
        console.log(`   💥 ${result.error}`);
      }
    });

    console.log("\n📈 Summary:");
    console.log(`   ✅ Passed: ${this.passed}`);
    console.log(`   ❌ Failed: ${this.failed}`);
    console.log(`   📊 Total:  ${this.passed + this.failed}`);

    const percentage = (
      (this.passed / (this.passed + this.failed)) *
      100
    ).toFixed(1);
    console.log(`   📈 Success Rate: ${percentage}%`);

    if (this.failed > 0) {
      console.log("\n⚠️  Some tests failed. Check the details above.");
      process.exit(1);
    } else {
      console.log("\n🎉 All smoke tests passed!");
      process.exit(0);
    }
  }
}

// Run the tests
const smokeTest = new SmokeTest();
smokeTest.runTests().catch(error => {
  console.error("💥 Smoke test runner failed:", error);
  process.exit(1);
});
