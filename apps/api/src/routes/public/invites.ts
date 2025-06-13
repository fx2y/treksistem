import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { DbClient } from "@treksistem/db";
import { DriverManagementService } from "../../services/driver-management.service";

const AcceptInviteRequest = z.object({
  token: z.string().min(1),
});

const app = new Hono<{
  Variables: {
    jwtPayload: { userId: string };
    db: DbClient;
  };
}>();

app.get("/verify", async c => {
  try {
    const token = c.req.query("token");
    if (!token) {
      return c.json({ error: "Token is required" }, 400);
    }

    const db = c.get("db");
    const driverService = new DriverManagementService(db);

    const result = await driverService.verifyInvite(token);

    return c.json({
      token: result.token,
      mitraName: result.mitraName,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("expired")
      ) {
        return c.json({ error: "Invitation not found or has expired." }, 404);
      }
    }
    return c.json({ error: "Failed to verify invitation" }, 500);
  }
});

app.post("/accept", zValidator("json", AcceptInviteRequest), async c => {
  try {
    const { token } = c.req.valid("json");
    const jwtPayload = c.get("jwtPayload");
    const userId = jwtPayload.userId;
    const db = c.get("db");
    const driverService = new DriverManagementService(db);

    const result = await driverService.acceptInvite(userId, token);

    return c.json({
      message: "Invitation accepted successfully.",
      mitraName: result.mitraName,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("Invalid") ||
        error.message.includes("expired") ||
        error.message.includes("does not match")
      ) {
        return c.json({ error: error.message }, 400);
      }
      if (
        error.message.includes("already been used") ||
        error.message.includes("already a driver")
      ) {
        return c.json({ error: error.message }, 409);
      }
    }
    return c.json({ error: "Failed to accept invitation" }, 500);
  }
});

export default app;