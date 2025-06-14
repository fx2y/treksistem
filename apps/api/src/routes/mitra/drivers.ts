import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { rateLimitByMitraId } from "../../middleware/rate-limit.middleware";
import type { ServiceContainer } from "../../services/factory";

const InviteDriverRequest = z.object({
  email: z.string().email().max(254).trim(),
});

const DriverParamsSchema = z.object({
  driverId: z.string().min(1).max(50),
});

const app = new Hono<{
  Variables: {
    mitraId: string;
    services: ServiceContainer;
  };
}>();

app.post("/invite", 
  async (c, next) => {
    const { rateLimitService } = c.get("services");
    return rateLimitByMitraId(rateLimitService, "driver:invite")(c, next);
  },
  zValidator("json", InviteDriverRequest), 
  async c => {
    const { email } = c.req.valid("json");
    const mitraId = c.get("mitraId");
    const { driverManagementService } = c.get("services");

    const result = await driverManagementService.inviteDriver(mitraId, email);
    return c.json(result);
  }
);

app.get("/", async c => {
  const mitraId = c.get("mitraId");
  const { driverManagementService } = c.get("services");
  const drivers = await driverManagementService.listDriversForMitra(mitraId);
  return c.json(drivers);
});

app.delete("/:driverId", zValidator("param", DriverParamsSchema), async c => {
  const mitraId = c.get("mitraId");
  const { driverId } = c.req.valid("param");
  const { driverManagementService } = c.get("services");

  await driverManagementService.removeDriver(mitraId, driverId);
  return c.body(null, 204);
});

export default app;
