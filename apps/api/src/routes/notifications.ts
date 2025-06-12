import { createDbClient, notificationLogs } from "@treksistem/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

type NotificationEnvironment = {
  DB: D1Database;
};

const notifications = new Hono<{
  Bindings: NotificationEnvironment;
}>();

notifications.post("/:logId/triggered", async c => {
  const { logId } = c.req.param();
  const db = createDbClient(c.env.DB);

  try {
    const result = await db
      .update(notificationLogs)
      .set({ status: "triggered" })
      .where(eq(notificationLogs.id, logId))
      .returning({ id: notificationLogs.id });

    if (result.length === 0) {
      return c.json(
        { success: false, error: "Notification log not found" },
        404
      );
    }

    return c.json({ success: true, logId: result[0].id, status: "triggered" });
  } catch (error) {
    console.error("Error updating notification log:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

export default notifications;
