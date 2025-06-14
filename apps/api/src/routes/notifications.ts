import { Hono } from "hono";

import type { ServiceContainer } from "../services/factory";

type NotificationEnvironment = {
  DB: D1Database;
};

const notifications = new Hono<{
  Bindings: NotificationEnvironment;
  Variables: {
    services: ServiceContainer;
  };
}>();

notifications.post("/:logId/triggered", async c => {
  const { logId } = c.req.param();
  const { notificationService } = c.get("services");

  await notificationService.markTriggered(logId);
  return c.json({ success: true, logId, status: "triggered" });
});

export default notifications;
