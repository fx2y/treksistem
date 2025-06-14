import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

export function createDbClient(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type DbClient = DrizzleD1Database<typeof schema>;
