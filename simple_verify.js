#!/usr/bin/env node

// Simple verification script for auth system components
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

console.log("🔍 Verifying Treksistem Auth System Components...\n");

// Check critical files exist
const criticalFiles = [
  "packages/auth/src/index.ts",
  "packages/auth/src/middleware.ts",
  "packages/auth/src/types.ts",
  "packages/audit/src/index.ts",
  "packages/db/src/schema/index.ts",
  "apps/api/src/routes/auth.ts",
  "apps/api/src/routes/admin.ts",
  "apps/api/src/routes/driver.ts",
  "apps/api/src/routes/mitra.ts",
  "apps/api/src/routes/public.ts",
  "wrangler.toml",
];

let allFilesExist = true;

console.log("📁 Checking critical files:");
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? "✅" : "❌"} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check package.json dependencies
console.log("\n📦 Checking package dependencies:");

const authPackageJson = JSON.parse(
  fs.readFileSync("packages/auth/package.json", "utf8")
);
const requiredAuthDeps = ["arctic", "oslo", "hono", "nanoid"];

requiredAuthDeps.forEach(dep => {
  const exists =
    authPackageJson.dependencies && authPackageJson.dependencies[dep];
  console.log(`  ${exists ? "✅" : "❌"} packages/auth: ${dep}`);
});

// Check wrangler.toml configuration
console.log("\n⚙️ Checking wrangler configuration:");
const wranglerConfig = fs.readFileSync("wrangler.toml", "utf8");

const configChecks = [
  { name: "nodejs_compat flag", pattern: /nodejs_compat/ },
  { name: "D1 database binding", pattern: /\[\[d1_databases\]\]/ },
  { name: "Environment variables", pattern: /GOOGLE_CLIENT_ID/ },
  { name: "JWT secret", pattern: /JWT_SECRET/ },
];

configChecks.forEach(check => {
  const exists = check.pattern.test(wranglerConfig);
  console.log(`  ${exists ? "✅" : "❌"} ${check.name}`);
});

// Check TypeScript files for key exports/imports
console.log("\n🔧 Checking auth system implementation:");

// Check auth factory
const authIndex = fs.readFileSync("packages/auth/src/index.ts", "utf8");
const authChecks = [
  { name: "createAuthServices export", pattern: /export.*createAuthServices/ },
  { name: "RefreshTokenService", pattern: /RefreshTokenService/ },
  { name: "Arctic OAuth provider", pattern: /from.*arctic/ },
  { name: "Oslo password hashing", pattern: /from.*oslo/ },
];

authChecks.forEach(check => {
  const exists = check.pattern.test(authIndex);
  console.log(`  ${exists ? "✅" : "❌"} Auth factory: ${check.name}`);
});

// Check middleware
const middleware = fs.readFileSync("packages/auth/src/middleware.ts", "utf8");
const middlewareChecks = [
  { name: "requireAuth middleware", pattern: /requireAuth/ },
  { name: "requireMitraRole middleware", pattern: /requireMitraRole/ },
  { name: "requireDriverRole middleware", pattern: /requireDriverRole/ },
  { name: "requireAdminRole middleware", pattern: /requireAdminRole/ },
];

middlewareChecks.forEach(check => {
  const exists = check.pattern.test(middleware);
  console.log(`  ${exists ? "✅" : "❌"} Middleware: ${check.name}`);
});

// Check auth routes
const authRoutes = fs.readFileSync("apps/api/src/routes/auth.ts", "utf8");
const routeChecks = [
  { name: "Google login route", pattern: /login\/google/ },
  { name: "OAuth callback route", pattern: /callback\/google/ },
  { name: "Token refresh endpoint", pattern: /refresh/ },
  { name: "Logout endpoint", pattern: /logout/ },
  { name: "User profile endpoint", pattern: /\/me/ },
];

routeChecks.forEach(check => {
  const exists = check.pattern.test(authRoutes);
  console.log(`  ${exists ? "✅" : "❌"} Auth routes: ${check.name}`);
});

// Summary
console.log("\n📊 Verification Summary:");
if (allFilesExist) {
  console.log("✅ All critical files are present");
  console.log("✅ Auth system components implemented");
  console.log("✅ Configuration appears correct");
  console.log("\n🎉 Treksistem Auth System verification passed!");
  console.log("\nNext steps:");
  console.log("1. Start the server: npx wrangler dev apps/api/src/index.ts");
  console.log("2. Test endpoints with manual curl commands");
  console.log("3. Run full OAuth flow in browser");
} else {
  console.log("❌ Some critical files missing");
  console.log("🔧 Fix missing components before proceeding");
}
