import { notificationTemplates, notificationLogs } from "@treksistem/db";
import { eq, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { nanoid } from "nanoid";

import type { NotificationType } from "./types";

export interface NotificationTemplate {
  id: string;
  type: string;
  language: string;
  content: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface NotificationLog {
  id: string;
  orderId: string;
  templateId: string | null;
  recipientPhone: string;
  type: string;
  status: "generated" | "triggered" | "failed";
  generatedAt: Date | null;
  triggeredAt: Date | null;
}

export class TemplateRepository {
  constructor(private db: DrizzleD1Database<any>) {}

  async findByTypeAndLanguage(
    type: NotificationType,
    language: string = "id"
  ): Promise<NotificationTemplate | null> {
    const results = await this.db
      .select()
      .from(notificationTemplates)
      .where(
        and(
          eq(notificationTemplates.type, type),
          eq(notificationTemplates.language, language)
        )
      )
      .limit(1);

    return results[0] || null;
  }

  async create(
    template: Omit<NotificationTemplate, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const id = nanoid();
    const now = new Date();

    await this.db.insert(notificationTemplates).values({
      id,
      type: template.type,
      language: template.language,
      content: template.content,
      createdAt: now,
      updatedAt: null,
    });

    return id;
  }

  async update(
    id: string,
    updates: Partial<
      Omit<NotificationTemplate, "id" | "createdAt" | "updatedAt">
    >
  ): Promise<void> {
    await this.db
      .update(notificationTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(notificationTemplates.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db
      .delete(notificationTemplates)
      .where(eq(notificationTemplates.id, id));
  }

  async findAll(): Promise<NotificationTemplate[]> {
    return await this.db.select().from(notificationTemplates);
  }

  async findById(id: string): Promise<NotificationTemplate | null> {
    const results = await this.db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.id, id))
      .limit(1);

    return results[0] || null;
  }
}

export class LogRepository {
  constructor(private db: DrizzleD1Database<any>) {}

  async create(log: {
    orderId: string;
    templateId?: string;
    recipientPhone: string;
    type: NotificationType;
    status?: "generated" | "triggered" | "failed";
  }): Promise<string> {
    const id = nanoid();
    const now = new Date();

    await this.db.insert(notificationLogs).values({
      id,
      orderId: log.orderId,
      templateId: log.templateId || null,
      recipientPhone: log.recipientPhone,
      type: log.type,
      status: log.status || "generated",
      generatedAt: now,
      triggeredAt: null,
    });

    return id;
  }

  async updateStatus(
    id: string,
    status: "generated" | "triggered" | "failed"
  ): Promise<void> {
    const updates: Record<string, unknown> = { status };

    if (status === "triggered") {
      updates.triggeredAt = new Date();
    }

    await this.db
      .update(notificationLogs)
      .set(updates)
      .where(eq(notificationLogs.id, id));
  }

  async findById(id: string): Promise<NotificationLog | null> {
    const results = await this.db
      .select()
      .from(notificationLogs)
      .where(eq(notificationLogs.id, id))
      .limit(1);

    return results[0] || null;
  }
}
