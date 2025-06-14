import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { ServiceContainer } from "../../../services/factory";

import { logbookQuerySchema } from "./validation";

const app = new Hono<{
  Variables: {
    services: ServiceContainer;
    mitraId: string;
    userId: string;
  };
}>();

app.get("/", zValidator("query", logbookQuerySchema), async c => {
  const mitraId = c.get("mitraId");
  const query = c.req.valid("query");

  const { logbookService } = c.get("services");
  const entries = await logbookService.getLogbook(mitraId, query);

  return c.json({ data: entries });
});

export { app as logbookRoutes };
