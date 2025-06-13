import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import type { drizzle } from "drizzle-orm/d1";

import { LogbookService } from "../../../services/logbook.service";
import { logbookQuerySchema } from "./validation";

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
    db: ReturnType<typeof drizzle>;
    mitraId: string;
    userId: string;
  };
}>();

app.get(
  "/",
  zValidator("query", logbookQuerySchema),
  async (c) => {
    const mitraId = c.get("mitraId");
    const query = c.req.valid("query");

    const logbookService = new LogbookService(c.get("db"));
    const entries = await logbookService.getLogbook(mitraId, query);

    return c.json({ data: entries });
  }
);

export { app as logbookRoutes };