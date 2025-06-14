import { auditLogs, type DbClient } from "@treksistem/db";

export type AuditEventType =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "SERVICE_CREATED"
  | "SERVICE_UPDATED"
  | "DRIVER_ASSIGNED"
  | "DRIVER_INVITED"
  | "DRIVER_ACCEPTED_INVITE"
  | "DRIVER_REMOVED"
  | "MITRA_MANUAL_ORDER_CREATED"
  | "MITRA_ORDER_ASSIGNED"
  | "VEHICLE_CREATED"
  | "VEHICLE_UPDATED"
  | "VEHICLE_DELETED"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "TOKEN_REFRESH"
  | "INVOICE_CREATED"
  | "INVOICE_PAYMENT_CONFIRMED"
  | "SUBSCRIPTION_STATUS_CHANGED"
  | "MITRA_PROFILE_UPDATED"
  | "MITRA_ONBOARDING_COMPLETED"
  | "MASTER_DATA_CREATED"
  | "MASTER_DATA_UPDATED"
  | "MASTER_DATA_DELETED";

export interface AuditLogOptions {
  actorId: string;
  mitraId?: string;
  entityType:
    | "ORDER"
    | "SERVICE"
    | "DRIVER"
    | "VEHICLE"
    | "USER"
    | "INVOICE"
    | "MITRA"
    | "MASTER_DATA";
  entityId: string;
  eventType: AuditEventType;
  details?: Record<string, unknown>;
}

export class AuditService {
  constructor(private db: DbClient) {}

  async log(options: AuditLogOptions): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        adminUserId: options.actorId,
        impersonatedMitraId: options.mitraId || null,
        targetEntity: options.entityType.toLowerCase(),
        targetId: options.entityId,
        action: options.eventType,
        payload: options.details || {},
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
  db: DbClient,
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
      | "VEHICLE"
      | "INVOICE"
      | "MITRA",
    entityId: options.targetId,
    eventType:
      `${options.targetEntity.toUpperCase()}_${options.action}D` as AuditEventType,
    details: options.payload,
  });
}
