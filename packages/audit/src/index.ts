import { auditLogs, type DbClient } from "@treksistem/db";

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
  action: string;
  payload: Record<string, unknown>;
}

export class AuditLoggingService {
  constructor(private db: DbClient) {}

  async logEvent(event: AuditLogEvent): Promise<void> {
    await this.db.insert(auditLogs).values({
      adminUserId: event.actorId,
      impersonatedMitraId: null,
      targetEntity: "AUTH",
      targetId: event.targetId || event.actorId,
      action: this.mapEventTypeToAction(event.eventType),
      payload: event.details || null,
    });
  }

  async logAdminAction(options: AdminAuditLogOptions): Promise<void> {
    await this.db.insert(auditLogs).values({
      adminUserId: options.adminUserId,
      impersonatedMitraId: options.impersonatedMitraId || null,
      targetEntity: options.targetEntity,
      targetId: options.targetId,
      action: options.action,
      payload: options.payload,
    });
  }

  private mapEventTypeToAction(eventType: string): string {
    switch (eventType.toUpperCase()) {
      case "USER_LOGIN":
      case "SESSION_CREATED":
        return "CREATE";
      case "USER_LOGOUT":
      case "SESSION_TERMINATED":
        return "DELETE";
      case "TOKEN_REFRESH":
        return "UPDATE";
      case "DRIVER_AVAILABILITY_CHANGED":
        return "DRIVER_AVAILABILITY_CHANGED";
      case "ORDER_STATUS_UPDATED":
        return "ORDER_STATUS_UPDATED";
      case "ORDER_STOP_COMPLETED":
        return "ORDER_STOP_COMPLETED";
      case "REPORT_SUBMITTED":
        return "REPORT_SUBMITTED";
      case "MITRA_MANUAL_ORDER_CREATED":
        return "MITRA_MANUAL_ORDER_CREATED";
      case "MITRA_ORDER_ASSIGNED":
        return "MITRA_ORDER_ASSIGNED";
      default:
        return "UPDATE";
    }
  }
}

export function createAuditService(db: DbClient): AuditLoggingService {
  return new AuditLoggingService(db);
}
