import { Hono } from "hono";
import type { DbClient } from "@treksistem/db";
import { DriverManagementService } from "../../services/driver-management.service";

const app = new Hono<{
  Variables: {
    mitraId: string;
    db: DbClient;
  };
}>();

app.post("/:inviteId/resend", async c => {
  try {
    const inviteId = c.req.param("inviteId");
    const mitraId = c.get("mitraId");
    const db = c.get("db");
    const driverService = new DriverManagementService(db);

    await driverService.resendInvite(mitraId, inviteId);

    return c.json({
      message: "Invitation resent successfully.",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return c.json({ error: "Invitation not found" }, 404);
      }
      if (error.message.includes("already been accepted")) {
        return c.json({ error: "Cannot resend an invitation that has already been accepted." }, 400);
      }
    }
    return c.json({ error: "Failed to resend invitation" }, 500);
  }
});

export default app;