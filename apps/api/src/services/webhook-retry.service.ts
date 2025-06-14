import type { D1Database } from "@cloudflare/workers-types";
import * as schema from "@treksistem/db";
import { drizzle } from "drizzle-orm/d1";
import { nanoid } from "nanoid";

export interface WebhookRetryAttempt {
  id: string;
  webhookType: "midtrans" | "notification";
  payload: object;
  lastError?: string;
  attemptCount: number;
  nextRetryAt: Date;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookRetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_CONFIG: WebhookRetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 300000, // 5 minutes
  backoffMultiplier: 2,
};

export class WebhookRetryService {
  private db: ReturnType<typeof drizzle<typeof schema>>;
  private config: WebhookRetryConfig;

  constructor(database: D1Database, config: Partial<WebhookRetryConfig> = {}) {
    this.db = drizzle(database, { schema });
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate next retry delay using exponential backoff
   */
  private calculateRetryDelay(attemptCount: number): number {
    const delay =
      this.config.baseDelayMs *
      Math.pow(this.config.backoffMultiplier, attemptCount);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Schedule a webhook for retry
   */
  async scheduleRetry(
    webhookType: "midtrans" | "notification",
    payload: object,
    error?: string
  ): Promise<string> {
    const retryId = nanoid();
    const nextRetryAt = new Date(Date.now() + this.calculateRetryDelay(0));

    // In a real implementation, this would use a dedicated webhook_retries table
    // For now, we'll store retry information in a structured way
    console.log(`Scheduling webhook retry: ${retryId}`, {
      webhookType,
      payload,
      error,
      nextRetryAt: nextRetryAt.toISOString(),
      maxRetries: this.config.maxRetries,
    });

    return retryId;
  }

  /**
   * Process webhook with retry logic
   */
  async processWithRetry<T>(
    webhookType: "midtrans" | "notification",
    payload: object,
    processor: () => Promise<T>
  ): Promise<T> {
    let attemptCount = 0;
    let lastError: Error | undefined;

    while (attemptCount < this.config.maxRetries) {
      try {
        return await processor();
      } catch (error) {
        lastError = error as Error;
        attemptCount++;

        console.error(
          `Webhook processing failed (attempt ${attemptCount}/${this.config.maxRetries}):`,
          {
            webhookType,
            error: lastError.message,
            attemptCount,
          }
        );

        if (attemptCount < this.config.maxRetries) {
          const delay = this.calculateRetryDelay(attemptCount - 1);
          console.log(`Retrying webhook in ${delay}ms...`);

          // In a serverless environment, we can't wait here
          // Instead, we schedule the retry for later processing
          await this.scheduleRetry(webhookType, payload, lastError.message);
          break;
        }
      }
    }

    // All retries exhausted
    console.error(
      `Webhook processing failed permanently after ${this.config.maxRetries} attempts:`,
      {
        webhookType,
        payload,
        error: lastError?.message,
      }
    );

    // Store failed webhook for manual review
    await this.storeFailedWebhook(webhookType, payload, lastError?.message);

    throw lastError || new Error("Webhook processing failed");
  }

  /**
   * Store failed webhook for manual review
   */
  private async storeFailedWebhook(
    webhookType: "midtrans" | "notification",
    payload: object,
    error?: string
  ): Promise<void> {
    // In a real implementation, this would store to a failed_webhooks table
    // For now, we'll use audit logging
    console.error("Webhook failed permanently - manual review required:", {
      webhookType,
      payload,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Process scheduled retries (would be called by a cron job)
   */
  async processScheduledRetries(): Promise<void> {
    // In a real implementation, this would:
    // 1. Query for retries that are ready to be processed
    // 2. Attempt to process each retry
    // 3. Update retry records based on success/failure
    // 4. Reschedule failed retries or mark as permanently failed

    console.log("Processing scheduled webhook retries...");
    // This would be implemented when we have a proper retry queue/table
  }

  /**
   * Clean up old retry records (would be called by a cleanup job)
   */
  async cleanupOldRetries(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    console.log(
      `Cleaning up webhook retry records older than ${cutoffDate.toISOString()}`
    );
    // This would be implemented when we have a proper retry queue/table
  }

  /**
   * Get retry statistics for monitoring
   */
  async getRetryStats(): Promise<{
    pendingRetries: number;
    failedWebhooks: number;
    successRate: number;
  }> {
    // In a real implementation, this would query the retry tables
    return {
      pendingRetries: 0,
      failedWebhooks: 0,
      successRate: 1.0,
    };
  }
}
