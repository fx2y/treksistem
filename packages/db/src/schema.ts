import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Example schema - replace with actual schema
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
