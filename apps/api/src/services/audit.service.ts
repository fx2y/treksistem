import { auditLogs } from "@treksistem/db";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { nanoid } from "nanoid";

export type AuditEventType =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "SERVICE_CREATED"
  | "DRIVER_ASSIGNED"
  | "MITRA_MANUAL_ORDER_CREATED"
  | "MITRA_ORDER_ASSIGNED";

export interface AuditLogOptions {
  actorId: string;
  mitraId?: string;
  entityType: "ORDER" | "SERVICE" | "DRIVER";
  entityId: string;
  eventType: AuditEventType;
  details?: Record<string, unknown>;
}

export class AuditService {
  constructor(private db: DrizzleD1Database<any>) {}

  async log(options: AuditLogOptions): Promise<void> {
    await this.db.insert(auditLogs).values({
      id: nanoid(),
      actorId: options.actorId,
      impersonatedMitraId: options.mitraId || null,
      targetEntity: options.entityType.toLowerCase(),
      targetId: options.entityId,
      eventType: options.eventType,
      payload: options.details || null,
      timestamp: new Date(),
    });
  }
}

// Legacy function for backward compatibility
export interface AdminAuditLogOptions {
  adminUserId: string;
  impersonatedMitraId?: string;
  targetEntity: string;
  targetId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "INVITE";
  payload?: Record<string, unknown>;
}

export async function logAdminAction(
  db: DrizzleD1Database<any>,
  options: AdminAuditLogOptions
): Promise<void> {
  const auditService = new AuditService(db);
  await auditService.log({
    actorId: options.adminUserId,
    mitraId: options.impersonatedMitraId,
    entityType: options.targetEntity.toUpperCase() as
      | "ORDER"
      | "SERVICE"
      | "DRIVER",
    entityId: options.targetId,
    eventType:
      `${options.targetEntity.toUpperCase()}_${options.action}D` as AuditEventType,
    details: options.payload,
  });
}
