import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "integration",
    include: ["src/tests/integration/**/*.test.ts"],
    setupFiles: ["src/tests/integration/setup.ts"],
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000,
    globals: true,
    environment: "node",
    pool: "forks", // Run tests in separate processes for better isolation
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork for shared database state
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/tests/**",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/types.ts",
      ],
    },
    env: {
      NODE_ENV: "test",
      DB_URL: "file:./test.db",
      JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
      FRONTEND_URL: "http://localhost:3000",
    },
  },
});