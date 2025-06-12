import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    wranglerConfigPath: "../../wrangler.toml",
    dbName: "treksistem-db-local",
  },
} satisfies Config;
