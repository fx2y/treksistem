import { auditLogs } from "@treksistem/db";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export type AuditEventType =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "SERVICE_CREATED"
  | "DRIVER_ASSIGNED"
  | "MITRA_MANUAL_ORDER_CREATED"
  | "MITRA_ORDER_ASSIGNED"
  | "VEHICLE_CREATED"
  | "VEHICLE_UPDATED"
  | "VEHICLE_DELETED";

export interface AuditLogOptions {
  actorId: string;
  mitraId?: string;
  entityType: "ORDER" | "SERVICE" | "DRIVER" | "VEHICLE";
  entityId: string;
  eventType: AuditEventType;
  details?: Record<string, unknown>;
}

export class AuditService {
  constructor(private db: DrizzleD1Database) {}

  async log(options: AuditLogOptions): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        adminUserId: options.actorId,
        impersonatedMitraId: options.mitraId || null,
        targetEntity: options.entityType.toLowerCase(),
        targetId: options.entityId,
        action: options.eventType,
        payload: options.details || null,
      });
    } catch (error) {
      // Audit logging MUST NOT fail the primary business operation
      console.error("Audit logging failed:", error);
    }
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
  db: DrizzleD1Database,
  options: AdminAuditLogOptions
): Promise<void> {
  const auditService = new AuditService(db);
  await auditService.log({
    actorId: options.adminUserId,
    mitraId: options.impersonatedMitraId,
    entityType: options.targetEntity.toUpperCase() as
      | "ORDER"
      | "SERVICE"
      | "DRIVER"
      | "VEHICLE",
    entityId: options.targetId,
    eventType:
      `${options.targetEntity.toUpperCase()}_${options.action}D` as AuditEventType,
    details: options.payload,
  });
}
