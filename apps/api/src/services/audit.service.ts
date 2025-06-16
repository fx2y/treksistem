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
  | "INVOICE_STATUS_UPDATED"
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

export interface AuditServiceDependencies {
  db: DbClient;
  auditQueue?: Queue;
}

export class AuditService {
  constructor(private deps: AuditServiceDependencies) {}

  async log(options: AuditLogOptions): Promise<void> {
    try {
      if (this.deps.auditQueue) {
        // Asynchronous processing via queue
        await this.deps.auditQueue.send({
          timestamp: new Date().toISOString(),
          adminUserId: options.actorId,
          impersonatedMitraId: options.mitraId || null,
          targetEntity: options.entityType.toLowerCase(),
          targetId: options.entityId,
          action: options.eventType,
          payload: options.details || {},
        });
      } else {
        // Fallback to direct database write
        await this.writeToDatabase(options);
      }
    } catch (error) {
      // Audit logging MUST NOT fail the primary business operation
      console.error("Audit logging failed:", error);
    }
  }

  private async writeToDatabase(options: AuditLogOptions): Promise<void> {
    await this.deps.db.insert(auditLogs).values({
      adminUserId: options.actorId,
      impersonatedMitraId: options.mitraId || null,
      targetEntity: options.entityType.toLowerCase(),
      targetId: options.entityId,
      action: options.eventType,
      payload: options.details || {},
    });
  }

  withAuditing<T extends any[], R>(
    auditOptions: Omit<AuditLogOptions, "entityId"> & {
      entityIdFrom?: (result: R) => string;
    },
    serviceMethod: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        const result = await serviceMethod(...args);

        // Determine entityId from result or use placeholder
        const entityId = auditOptions.entityIdFrom
          ? auditOptions.entityIdFrom(result)
          : "COMPLETED";

        // Log successful operation
        await this.log({
          ...auditOptions,
          entityId,
        });

        return result;
      } catch (error) {
        // Service method failed, no audit log needed
        throw error;
      }
    };
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
  const auditService = new AuditService({ db });
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
