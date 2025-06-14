import { zValidator } from "@hono/zod-validator";
import type { DbClient } from "@treksistem/db";
import { Hono } from "hono";
import { z } from "zod";

import { DriverManagementService } from "../../services/driver-management.service";

const InviteDriverRequest = z.object({
  email: z.string().email().max(254).trim(),
});

const DriverParamsSchema = z.object({
  driverId: z.string().min(1).max(50),
});

const app = new Hono<{
  Variables: {
    mitraId: string;
    db: DbClient;
  };
}>();

app.post("/invite", zValidator("json", InviteDriverRequest), async c => {
  try {
    const { email } = c.req.valid("json");
    const mitraId = c.get("mitraId");
    const db = c.get("db");
    const driverService = new DriverManagementService(db);

    const result = await driverService.inviteDriver(mitraId, email);

    return c.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("already exists") ||
        error.message.includes("already")
      ) {
        return c.json({ error: error.message }, 409);
      }
    }
    return c.json({ error: "Failed to send invitation" }, 500);
  }
});

app.get("/", async c => {
  try {
    const mitraId = c.get("mitraId");
    const db = c.get("db");
    const driverService = new DriverManagementService(db);
    const drivers = await driverService.listDriversForMitra(mitraId);

    return c.json(drivers);
  } catch (error) {
    return c.json({ error: "Failed to fetch drivers" }, 500);
  }
});

app.delete("/:driverId", zValidator("param", DriverParamsSchema), async c => {
  try {
    const mitraId = c.get("mitraId");
    const { driverId } = c.req.valid("param");
    const db = c.get("db");
    const driverService = new DriverManagementService(db);

    await driverService.removeDriver(mitraId, driverId);

    return c.body(null, 204);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      return c.json({ error: error.message }, 404);
    }
    return c.json({ error: "Failed to remove driver" }, 500);
  }
});

export default app;
