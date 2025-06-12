import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./migrations",
  driver: "d1",
  dbCredentials: {
    wranglerConfigPath: "../../wrangler.toml",
    dbName: "treksistem-db",
  },
} satisfies Config;
