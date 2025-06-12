import { notificationLogs } from "@treksistem/db";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { nanoid } from "nanoid";

import { NotificationTemplates } from "./templates";
import type { NotificationType, NotificationPayload } from "./types";
import { formatPhoneNumber, formatMessage } from "./utils";

export async function generateNotification(
  db: DrizzleD1Database<any>,
  type: NotificationType,
  payload: NotificationPayload
): Promise<{
  logId: string;
  link: string;
  message: string;
}> {
  const template = NotificationTemplates[type];
  const formattedPhone = formatPhoneNumber(payload.recipientPhone);

  const templateData: Record<string, string> = {
    orderPublicId: "orderPublicId" in payload ? payload.orderPublicId : "",
    mitraName: "mitraName" in payload ? payload.mitraName : "",
    pickupAddress: "pickupAddress" in payload ? payload.pickupAddress : "",
    destinationAddress:
      "destinationAddress" in payload ? payload.destinationAddress : "",
    trackingUrl: "trackingUrl" in payload ? payload.trackingUrl : "",
    updateMessage: "updateMessage" in payload ? payload.updateMessage : "",
  };

  const message = formatMessage(template, templateData);
  const encodedMessage = encodeURIComponent(message);
  const link = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  const logId = nanoid();

  await db.insert(notificationLogs).values({
    id: logId,
    orderId: "orderPublicId" in payload ? payload.orderPublicId : "unknown",
    recipientPhone: formattedPhone,
    type,
    status: "generated",
  });

  return {
    logId,
    link,
    message,
  };
}

export * from "./types";
