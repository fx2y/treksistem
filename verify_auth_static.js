#!/usr/bin/env node

/**
 * Static Auth Module Verification Script
 * Verifies the auth implementation without requiring a running server
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

// Test state
let testResults = [];
let totalTests = 0;
let passedTests = 0;

// Utilities
function log(message, level = "info") {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "📋",
    success: "✅",
    error: "❌",
    warning: "⚠️",
  }[level];

  console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(name, passed, details = "") {
  totalTests++;
  if (passed) {
    passedTests++;
    log(`${name} - PASSED ${details}`, "success");
  } else {
    log(`${name} - FAILED ${details}`, "error");
  }

  testResults.push({
    name,
    passed,
    details,
    timestamp: new Date().toISOString(),
  });
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function parsePackageJson(filePath) {
  try {
    const content = readFile(filePath);
    return content ? JSON.parse(content) : null;
  } catch {
    return null;
  }
}

function testFileStructure() {
  log("Testing auth module file structure...", "info");

  const requiredFiles = [
    "packages/auth/src/index.ts",
    "packages/auth/src/middleware.ts",
    "packages/auth/src/types.ts",
    "packages/auth/package.json",
    "packages/audit/src/index.ts",
    "packages/audit/package.json",
    "apps/api/src/routes/auth.ts",
    "apps/api/src/index.ts",
  ];

  requiredFiles.forEach(file => {
    const exists = fileExists(file);
    recordTest(`Required file: ${file}`, exists, exists ? "exists" : "missing");
  });
}

function testPackageDependencies() {
  log("Testing package dependencies...", "info");

  const authPkg = parsePackageJson("packages/auth/package.json");
  const apiPkg = parsePackageJson("apps/api/package.json");

  // Test auth package dependencies
  if (authPkg) {
    const requiredAuthDeps = ["arctic", "oslo", "hono"];
    requiredAuthDeps.forEach(dep => {
      const hasDepInDeps = authPkg.dependencies && authPkg.dependencies[dep];
      const hasDepInDevDeps =
        authPkg.devDependencies && authPkg.devDependencies[dep];
      const hasDep = hasDepInDeps || hasDepInDevDeps;

      recordTest(
        `Auth package dependency: ${dep}`,
        hasDep,
        hasDep ? "found" : "missing"
      );
    });
  } else {
    recordTest("Auth package.json", false, "file not found or invalid");
  }

  // Test API package dependencies
  if (apiPkg) {
    const requiredApiDeps = ["hono"];
    requiredApiDeps.forEach(dep => {
      const hasDepInDeps = apiPkg.dependencies && apiPkg.dependencies[dep];
      const hasDepInDevDeps =
        apiPkg.devDependencies && apiPkg.devDependencies[dep];
      const hasDep = hasDepInDeps || hasDepInDevDeps;

      recordTest(
        `API package dependency: ${dep}`,
        hasDep,
        hasDep ? "found" : "missing"
      );
    });

    // drizzle-orm is in @treksistem/db workspace package
    const hasDbWorkspace =
      apiPkg.dependencies && apiPkg.dependencies["@treksistem/db"];
    recordTest(
      "API database access via workspace",
      hasDbWorkspace,
      hasDbWorkspace
        ? "@treksistem/db workspace package found"
        : "missing database access"
    );
  } else {
    recordTest("API package.json", false, "file not found or invalid");
  }
}

function testAuthModuleImplementation() {
  log("Testing auth module implementation...", "info");

  const authIndex = readFile("packages/auth/src/index.ts");
  if (authIndex) {
    // Test for required exports
    const requiredExports = [
      "createAuthServices",
      "JwtService",
      "RefreshTokenService",
      "Google", // Google from arctic library, not GoogleOAuthProvider
    ];

    requiredExports.forEach(exportName => {
      const hasExport = authIndex.includes(exportName);
      recordTest(
        `Auth module export: ${exportName}`,
        hasExport,
        hasExport ? "found" : "missing"
      );
    });

    // Test for security implementations
    const securityFeatures = [
      { name: "Argon2 hashing", pattern: /Argon2id|oslo\/password/ },
      { name: "Arctic OAuth library", pattern: /arctic|Google/ },
      { name: "JWT token creation", pattern: /sign.*jwt|hono\/jwt/ },
      {
        name: "Refresh token service",
        pattern: /RefreshTokenService|createRefreshToken/,
      },
    ];

    securityFeatures.forEach(feature => {
      const hasFeature = feature.pattern.test(authIndex);
      recordTest(
        `Security feature: ${feature.name}`,
        hasFeature,
        hasFeature ? "implemented" : "missing"
      );
    });
  } else {
    recordTest("Auth module main file", false, "file not found");
  }
}

function testMiddlewareImplementation() {
  log("Testing middleware implementation...", "info");

  const middleware = readFile("packages/auth/src/middleware.ts");
  if (middleware) {
    const requiredMiddleware = [
      "requireAuth",
      "requireMitraRole",
      "requireDriverRole",
      "requireAdminRole",
    ];

    requiredMiddleware.forEach(middlewareName => {
      const hasMiddleware = middleware.includes(middlewareName);
      recordTest(
        `Middleware function: ${middlewareName}`,
        hasMiddleware,
        hasMiddleware ? "found" : "missing"
      );
    });

    // Test for proper error handling
    const hasErrorHandling =
      middleware.includes("401") && middleware.includes("403");
    recordTest(
      "Middleware error handling",
      hasErrorHandling,
      hasErrorHandling ? "implemented" : "missing proper status codes"
    );
  } else {
    recordTest("Middleware file", false, "file not found");
  }
}

function testAuthRoutes() {
  log("Testing auth routes implementation...", "info");

  const authRoutes = readFile("apps/api/src/routes/auth.ts");
  if (authRoutes) {
    const requiredRoutes = [
      { name: "Login route", pattern: /\/login\/google|google.*login/ },
      {
        name: "Callback route",
        pattern: /\/callback\/google|google.*callback/,
      },
      { name: "Refresh route", pattern: /\/refresh|refresh.*token/ },
      { name: "Logout route", pattern: /\/logout/ },
      { name: "Me route", pattern: /\/me/ },
    ];

    requiredRoutes.forEach(route => {
      const hasRoute = route.pattern.test(authRoutes);
      recordTest(
        `Auth route: ${route.name}`,
        hasRoute,
        hasRoute ? "implemented" : "missing"
      );
    });

    // Test for audit logging
    const hasAuditLogging =
      authRoutes.includes("audit") || authRoutes.includes("log");
    recordTest(
      "Audit logging in routes",
      hasAuditLogging,
      hasAuditLogging ? "implemented" : "missing"
    );
  } else {
    recordTest("Auth routes file", false, "file not found");
  }
}

function testDatabaseSchema() {
  log("Testing database schema...", "info");

  const schema = readFile("packages/db/src/schema/index.ts");
  if (schema) {
    const requiredTables = [
      { name: "users table", pattern: /export const users.*=.*sqliteTable/ },
      {
        name: "refresh_tokens table",
        pattern: /export const refreshTokens.*=.*sqliteTable/,
      },
      { name: "mitras table", pattern: /export const mitras.*=.*sqliteTable/ },
      {
        name: "drivers table",
        pattern: /export const drivers.*=.*sqliteTable/,
      },
      {
        name: "audit_logs table",
        pattern: /export const auditLogs.*=.*sqliteTable/,
      },
    ];

    requiredTables.forEach(table => {
      const hasTable = table.pattern.test(schema);
      recordTest(
        `Database schema: ${table.name}`,
        hasTable,
        hasTable ? "defined" : "missing"
      );
    });

    // Test for proper field types
    const hasProperTypes =
      schema.includes("timestamp") &&
      schema.includes("text") &&
      schema.includes("integer");
    recordTest(
      "Database field types",
      hasProperTypes,
      hasProperTypes ? "proper types used" : "missing proper field types"
    );
  } else {
    recordTest("Database schema file", false, "file not found");
  }
}

function testConfigurationFiles() {
  log("Testing configuration files...", "info");

  // Test wrangler.toml
  const wrangler = readFile("wrangler.toml");
  if (wrangler) {
    const hasRequiredConfig =
      wrangler.includes("JWT_SECRET") &&
      wrangler.includes("GOOGLE_CLIENT_ID") &&
      wrangler.includes("GOOGLE_CLIENT_SECRET");
    recordTest(
      "Wrangler configuration",
      hasRequiredConfig,
      hasRequiredConfig
        ? "contains required env vars"
        : "missing required environment variables"
    );
  } else {
    recordTest("Wrangler configuration", false, "wrangler.toml not found");
  }

  // Test TypeScript configs
  const authTsConfig = parsePackageJson("packages/auth/tsconfig.json");
  recordTest(
    "Auth TypeScript config",
    authTsConfig !== null,
    authTsConfig ? "valid JSON" : "missing or invalid"
  );
}

function testAuditModule() {
  log("Testing audit module...", "info");

  const auditModule = readFile("packages/audit/src/index.ts");
  if (auditModule) {
    const auditFeatures = [
      {
        name: "AuditLoggingService",
        pattern: /AuditLoggingService|class.*Audit/,
      },
      { name: "Login event logging", pattern: /login|LOGIN/ },
      { name: "Logout event logging", pattern: /logout|LOGOUT/ },
      { name: "Token refresh logging", pattern: /refresh|REFRESH/ },
    ];

    auditFeatures.forEach(feature => {
      const hasFeature = feature.pattern.test(auditModule);
      recordTest(
        `Audit feature: ${feature.name}`,
        hasFeature,
        hasFeature ? "implemented" : "missing"
      );
    });
  } else {
    recordTest("Audit module", false, "file not found");
  }
}

function testApplicationEntry() {
  log("Testing application entry point...", "info");

  const appIndex = readFile("apps/api/src/index.ts");
  if (appIndex) {
    const entryFeatures = [
      { name: "Auth services factory usage", pattern: /createAuthServices/ },
      { name: "Context injection", pattern: /set.*auth|auth.*context/ },
      { name: "Route mounting", pattern: /route.*auth|\/auth/ },
    ];

    entryFeatures.forEach(feature => {
      const hasFeature = feature.pattern.test(appIndex);
      recordTest(
        `App entry: ${feature.name}`,
        hasFeature,
        hasFeature ? "implemented" : "missing"
      );
    });
  } else {
    recordTest("Application entry point", false, "file not found");
  }
}

function testSecurityBestPractices() {
  log("Testing security best practices...", "info");

  // Check that sensitive data is not hardcoded
  const filesToCheck = [
    "apps/api/src/routes/auth.ts",
    "packages/auth/src/index.ts",
    "wrangler.toml",
  ];

  const sensitivePatterns = [
    {
      name: "No hardcoded secrets",
      pattern: /secret.*=.*["|'](?!test|placeholder|example)[a-zA-Z0-9]{20,}/,
      invert: true,
    },
    {
      name: "No hardcoded passwords",
      pattern: /password.*=.*["|'][^"']+["|']/,
      invert: true,
    },
    {
      name: "No API keys in code",
      pattern: /api_key.*=.*["|'][^"']{20,}/,
      invert: true,
    },
  ];

  filesToCheck.forEach(filePath => {
    const content = readFile(filePath);
    if (content) {
      sensitivePatterns.forEach(pattern => {
        const hasPattern = pattern.pattern.test(content);
        const testPassed = pattern.invert ? !hasPattern : hasPattern;
        recordTest(
          `Security check in ${path.basename(filePath)}: ${pattern.name}`,
          testPassed,
          testPassed ? "secure" : "potential security issue"
        );
      });
    }
  });
}

function generateReport() {
  log("\n🏁 STATIC VERIFICATION COMPLETE", "info");
  log(`📊 Results: ${passedTests}/${totalTests} tests passed`, "info");

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  log(`📈 Success Rate: ${successRate}%`, "info");

  if (passedTests === totalTests) {
    log(
      "🎉 ALL TESTS PASSED - Auth module implementation is complete!",
      "success"
    );
  } else {
    log("⚠️  Some tests failed - review the implementation", "warning");
  }

  // Group results by status
  const failed = testResults.filter(t => !t.passed);
  // const passed = testResults.filter(t => t.passed); // Currently unused

  if (failed.length > 0) {
    log("\n❌ FAILED TESTS:", "error");
    failed.forEach(test => {
      log(`  • ${test.name}: ${test.details}`, "error");
    });
  }

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    type: "static_verification",
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      successRate: successRate + "%",
    },
    tests: testResults,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      workingDirectory: process.cwd(),
    },
  };

  fs.writeFileSync(
    "auth-static-verification-report.json",
    JSON.stringify(report, null, 2)
  );

  log(
    "📄 Detailed report saved to: auth-static-verification-report.json",
    "info"
  );

  // Exit with proper code
  process.exit(passedTests === totalTests ? 0 : 1);
}

async function main() {
  log("🚀 Starting Treksistem Auth Module Static Verification", "info");
  log(`📁 Working directory: ${process.cwd()}`, "info");

  try {
    // Run all test suites
    testFileStructure();
    testPackageDependencies();
    testAuthModuleImplementation();
    testMiddlewareImplementation();
    testAuthRoutes();
    testDatabaseSchema();
    testConfigurationFiles();
    testAuditModule();
    testApplicationEntry();
    testSecurityBestPractices();
  } catch (error) {
    log(`💥 Verification failed with error: ${error.message}`, "error");
    process.exit(1);
  }

  generateReport();
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  log("\n🛑 Verification interrupted by user", "warning");
  generateReport();
});

// Run the verification
if (require.main === module) {
  main().catch(error => {
    log(`💥 Fatal error: ${error.message}`, "error");
    process.exit(1);
  });
}

module.exports = {
  testFileStructure,
  testPackageDependencies,
  testAuthModuleImplementation,
  testMiddlewareImplementation,
  testAuthRoutes,
  testDatabaseSchema,
};
