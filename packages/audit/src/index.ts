import type { DrizzleD1Database } from "drizzle-orm/d1";
import { nanoid } from "nanoid";

export interface AuditLogEvent {
  actorId: string;
  eventType: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

export interface AdminAuditLogOptions {
  adminUserId: string;
  impersonatedMitraId?: string;
  targetEntity: string;
  targetId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "INVITE";
  payload: Record<string, unknown>;
}

export interface AuditLogsTable {
  id: string;
  actorId: string;
  impersonatorId: string | null;
  targetEntity: string;
  targetId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "INVITE";
  payload: Record<string, unknown> | null;
  createdAt: Date;
}

export class AuditLoggingService {
  constructor(private db: DrizzleD1Database<any>) {}

  async logEvent(event: AuditLogEvent): Promise<void> {
    await this.db.insert("audit_logs" as any).values({
      id: nanoid(),
      actorId: event.actorId,
      impersonatorId: null,
      targetEntity: "AUTH",
      targetId: event.targetId || event.actorId,
      action: this.mapEventTypeToAction(event.eventType),
      payload: event.details || null,
      createdAt: new Date(),
    });
  }

  async logAdminAction(options: AdminAuditLogOptions): Promise<void> {
    await this.db.insert("audit_logs" as any).values({
      id: nanoid(),
      actorId: options.adminUserId,
      impersonatorId: options.adminUserId,
      targetEntity: options.targetEntity,
      targetId: options.targetId,
      action: options.action,
      payload: options.payload,
      createdAt: new Date(),
    });
  }

  private mapEventTypeToAction(
    eventType: string
  ): "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "INVITE" {
    switch (eventType.toUpperCase()) {
      case "USER_LOGIN":
      case "SESSION_CREATED":
        return "CREATE";
      case "USER_LOGOUT":
      case "SESSION_TERMINATED":
        return "DELETE";
      case "TOKEN_REFRESH":
        return "UPDATE";
      default:
        return "UPDATE";
    }
  }
}

export function createAuditService(
  db: DrizzleD1Database<any>
): AuditLoggingService {
  return new AuditLoggingService(db);
}
