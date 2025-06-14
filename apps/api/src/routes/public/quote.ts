import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { ServiceContainer } from "../../services/factory";

const quote = new Hono<{
  Bindings: {
    DB: D1Database;
  };
  Variables: {
    services: ServiceContainer;
  };
}>();

const StopInputSchema = z.object({
  address: z.string().min(1).max(500).trim(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(["pickup", "dropoff"]),
});

const QuoteRequestSchema = z.object({
  serviceId: z.string().min(1).max(50).trim(),
  stops: z.array(StopInputSchema).min(2).max(10),
});

quote.post("/", zValidator("json", QuoteRequestSchema), async c => {
  const { publicOrderService } = c.get("services");
  const request = c.req.valid("json");

  const quoteResponse = await publicOrderService.calculateQuote(request);
  return c.json(quoteResponse);
});

export default quote;
