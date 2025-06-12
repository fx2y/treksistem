import * as schema from "@treksistem/db";
import { drizzle } from "drizzle-orm/d1";
import { nanoid } from "nanoid";

export interface AdminAuditLogOptions {
  adminUserId: string;
  impersonatedMitraId?: string;
  targetEntity: string;
  targetId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "INVITE";
  payload?: Record<string, unknown>;
}

export async function logAdminAction(
  db: ReturnType<typeof drizzle<typeof schema>>,
  options: AdminAuditLogOptions
): Promise<void> {
  await db.insert(schema.auditLogs).values({
    id: nanoid(),
    adminUserId: options.adminUserId,
    impersonatedMitraId: options.impersonatedMitraId || null,
    targetEntity: options.targetEntity,
    targetId: options.targetId,
    action: options.action,
    payload: options.payload || null,
    timestamp: new Date(),
  });
}
