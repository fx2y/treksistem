import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit",
    include: ["src/**/*.test.ts"],
    exclude: [
      "src/tests/integration/**",
      "src/tests/e2e/**",
      "src/routes/**/*.integration.test.ts",
    ],
    testTimeout: 10000, // 10 seconds for unit tests
    hookTimeout: 10000,
    globals: true,
    environment: "node",
    pool: "threads", // Faster parallel execution for unit tests
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/tests/**",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/types.ts",
        "src/index.ts",
      ],
    },
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
      FRONTEND_URL: "http://localhost:3000",
    },
  },
});
