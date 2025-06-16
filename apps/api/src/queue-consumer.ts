import { auditLogs, createDbClient } from "@treksistem/db";

import type { Bindings } from "./types";

interface AuditLogMessage {
  timestamp: string;
  adminUserId: string;
  impersonatedMitraId?: string | null;
  targetEntity: string;
  targetId: string;
  action: string;
  payload: Record<string, unknown>;
}

export default {
  async queue(
    batch: MessageBatch<AuditLogMessage>,
    env: Bindings
  ): Promise<void> {
    const db = createDbClient(env.DB);

    for (const message of batch.messages) {
      try {
        const auditData = message.body;
        
        await db.insert(auditLogs).values({
          adminUserId: auditData.adminUserId,
          impersonatedMitraId: auditData.impersonatedMitraId,
          targetEntity: auditData.targetEntity,
          targetId: auditData.targetId,
          action: auditData.action,
          payload: auditData.payload,
          createdAt: new Date(auditData.timestamp),
        });

        // Acknowledge successful processing
        message.ack();
      } catch (error) {
        console.error("Failed to process audit log message:", error);
        // Message will be retried automatically
        message.retry();
      }
    }
  },
};