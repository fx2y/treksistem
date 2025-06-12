import type { DrizzleD1Database } from "drizzle-orm/d1";

import { render } from "./engine";
import { TemplateRepository, LogRepository } from "./repository";
import type {
  NotificationType,
  NotificationPayload,
  FormattedNotification,
  NotificationServiceOptions,
} from "./types";
import { formatPhoneNumber } from "./utils";

export class NotificationService {
  private templateRepo: TemplateRepository;
  private logRepo: LogRepository;

  constructor(private db: DrizzleD1Database<any>) {
    this.templateRepo = new TemplateRepository(db);
    this.logRepo = new LogRepository(db);
  }

  async generate(
    type: NotificationType,
    payload: NotificationPayload,
    options: NotificationServiceOptions = {}
  ): Promise<{ logId: string; notification: FormattedNotification }> {
    const { language = "id", orderId } = options;

    // Fetch template from database
    const template = await this.templateRepo.findByTypeAndLanguage(
      type,
      language
    );
    if (!template) {
      throw new Error(
        `No template found for type: ${type}, language: ${language}`
      );
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(payload.data.recipientPhone);

    // Render message with template engine
    const message = render(
      template.content,
      payload.data as Record<string, string>
    );
    const encodedMessage = encodeURIComponent(message);
    const waLink = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    // Create log entry
    const logId = await this.logRepo.create({
      orderId:
        orderId ||
        ("orderId" in payload.data ? payload.data.orderId : "unknown"),
      templateId: template.id,
      recipientPhone: formattedPhone,
      type,
      status: "generated",
    });

    const notification: FormattedNotification = {
      recipientPhone: formattedPhone,
      message,
      waLink,
    };

    return { logId, notification };
  }

  async markTriggered(logId: string): Promise<void> {
    await this.logRepo.updateStatus(logId, "triggered");
  }

  async markFailed(logId: string): Promise<void> {
    await this.logRepo.updateStatus(logId, "failed");
  }
}

// Legacy compatibility function
export async function generateNotification(
  db: DrizzleD1Database<any>,
  type: NotificationType,
  payload: NotificationPayload
): Promise<{
  logId: string;
  link: string;
  message: string;
}> {
  const service = new NotificationService(db);
  const result = await service.generate(type, payload);

  return {
    logId: result.logId,
    link: result.notification.waLink,
    message: result.notification.message,
  };
}

export * from "./types";
export * from "./repository";
