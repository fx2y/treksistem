import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import { createDbClient } from "@treksistem/db";
import { Hono } from "hono";
import { z } from "zod";

import { DriverWorkflowService } from "../../services/driver-workflow.service";

const UpdateDriverStatusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

const status = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
    driverId: string;
  };
}>();

status.post("/", zValidator("json", UpdateDriverStatusSchema), async c => {
  const driverId = c.get("driverId");
  const { status: driverStatus } = c.req.valid("json");

  const db = createDbClient(c.env.DB);
  const service = new DriverWorkflowService(db);

  try {
    await service.updateDriverAvailability(driverId, driverStatus);
    return c.body(null, 204);
  } catch (error) {
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update driver status",
      },
      400
    );
  }
});

export default status;
