import type { DbClient } from "@treksistem/db";

import { BadRequestError } from "../lib/errors";

export interface SchemaValidationServiceDependencies {
  db: DbClient;
  alertingKV?: KVNamespace; // Optional KV store for alerting state
}

export interface SchemaValidationResult {
  isValid: boolean;
  missingTables?: string[];
  extraTables?: string[];
  errors?: string[];
}

export interface AlertingMetrics {
  lastFailureTime?: number;
  consecutiveFailures: number;
  lastAlertSent?: number;
  totalFailures: number;
}

export class SchemaValidationService {
  private static readonly ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
  private static readonly ALERT_THRESHOLD = 3; // Alert after 3 consecutive failures

  constructor(private deps: SchemaValidationServiceDependencies) {}

  // Expected tables based on our Drizzle schema
  private readonly expectedTables = [
    "users",
    "refresh_tokens",
    "oauth_sessions",
    "mitras",
    "drivers",
    "driver_invites",
    "vehicles",
    "master_vehicle_types",
    "master_payload_types",
    "master_facilities",
    "services",
    "services_to_vehicle_types",
    "services_to_payload_types",
    "services_to_facilities",
    "service_rates",
    "orders",
    "order_stops",
    "order_reports",
    "notification_templates",
    "notification_logs",
    "driver_locations",
    "audit_logs",
    "invoices",
  ];

  async validateSchema(): Promise<SchemaValidationResult> {
    try {
      // Get all tables from the database
      const result = await this.deps.db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name;
      `);

      const actualTables = result.map((row: any) => row.name);

      // Find missing and extra tables
      const missingTables = this.expectedTables.filter(
        table => !actualTables.includes(table)
      );

      const extraTables = actualTables.filter(
        table => !this.expectedTables.includes(table)
      );

      const errors: string[] = [];

      // Check for critical missing tables
      const criticalTables = ["users", "mitras", "drivers", "orders"];
      const missingCritical = missingTables.filter(table =>
        criticalTables.includes(table)
      );

      if (missingCritical.length > 0) {
        errors.push(`Missing critical tables: ${missingCritical.join(", ")}`);
      }

      const isValid = missingTables.length === 0 && errors.length === 0;

      return {
        isValid,
        missingTables: missingTables.length > 0 ? missingTables : undefined,
        extraTables: extraTables.length > 0 ? extraTables : undefined,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Schema validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  async validateTableStructure(tableName: string): Promise<boolean> {
    try {
      // Get table schema
      const result = await this.deps.db.all(`PRAGMA table_info(${tableName})`);

      // Basic validation - table exists and has columns
      return result.length > 0;
    } catch {
      return false;
    }
  }

  async checkForeignKeyConstraints(): Promise<{
    isValid: boolean;
    errors?: string[];
  }> {
    try {
      // Check if foreign key constraints are enabled
      const fkResult = await this.deps.db.all("PRAGMA foreign_keys");
      const fkEnabled = (fkResult[0] as any)?.foreign_keys === 1;

      if (!fkEnabled) {
        return {
          isValid: false,
          errors: ["Foreign key constraints are not enabled"],
        };
      }

      // Check for foreign key constraint violations
      const violations = await this.deps.db.all("PRAGMA foreign_key_check");

      if (violations.length > 0) {
        return {
          isValid: false,
          errors: violations.map(
            (v: any) =>
              `Foreign key violation in table ${v.table}, rowid ${v.rowid}`
          ),
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Foreign key check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  async runFullValidation(): Promise<SchemaValidationResult> {
    const schemaResult = await this.validateSchema();
    const fkResult = await this.checkForeignKeyConstraints();

    const allErrors = [
      ...(schemaResult.errors || []),
      ...(fkResult.errors || []),
    ];

    return {
      isValid: schemaResult.isValid && fkResult.isValid,
      missingTables: schemaResult.missingTables,
      extraTables: schemaResult.extraTables,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };
  }

  async ensureSchemaValid(): Promise<void> {
    const result = await this.runFullValidation();

    if (!result.isValid) {
      // Handle failure monitoring and alerting
      await this.handleValidationFailure(result);

      const errorMessage = [
        "Database schema validation failed:",
        ...(result.errors || []),
        result.missingTables
          ? `Missing tables: ${result.missingTables.join(", ")}`
          : null,
        result.extraTables
          ? `Extra tables: ${result.extraTables.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      throw new BadRequestError(errorMessage, "SCHEMA_VALIDATION_FAILED");
    } else {
      // Reset failure counter on success
      await this.handleValidationSuccess();
    }
  }

  private async getAlertingMetrics(): Promise<AlertingMetrics> {
    if (!this.deps.alertingKV) {
      return { consecutiveFailures: 0, totalFailures: 0 };
    }

    try {
      const data = await this.deps.alertingKV.get("schema_validation_metrics");
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to get alerting metrics:", error);
    }

    return { consecutiveFailures: 0, totalFailures: 0 };
  }

  private async updateAlertingMetrics(metrics: AlertingMetrics): Promise<void> {
    if (!this.deps.alertingKV) {
      return;
    }

    try {
      await this.deps.alertingKV.put(
        "schema_validation_metrics",
        JSON.stringify(metrics),
        { expirationTtl: 7 * 24 * 60 * 60 } // 7 days
      );
    } catch (error) {
      console.error("Failed to update alerting metrics:", error);
    }
  }

  private async handleValidationFailure(
    result: SchemaValidationResult
  ): Promise<void> {
    const now = Date.now();
    const metrics = await this.getAlertingMetrics();

    // Update failure metrics
    metrics.lastFailureTime = now;
    metrics.consecutiveFailures++;
    metrics.totalFailures++;

    // Check if we should send an alert
    const shouldAlert =
      metrics.consecutiveFailures >= SchemaValidationService.ALERT_THRESHOLD &&
      (!metrics.lastAlertSent ||
        now - metrics.lastAlertSent >
          SchemaValidationService.ALERT_COOLDOWN_MS);

    if (shouldAlert) {
      await this.sendAlert(result, metrics);
      metrics.lastAlertSent = now;
    }

    await this.updateAlertingMetrics(metrics);

    // Log the failure for monitoring systems
    console.error("Schema validation failure detected:", {
      consecutiveFailures: metrics.consecutiveFailures,
      totalFailures: metrics.totalFailures,
      errors: result.errors,
      missingTables: result.missingTables,
      extraTables: result.extraTables,
      alertSent: shouldAlert,
    });
  }

  private async handleValidationSuccess(): Promise<void> {
    const metrics = await this.getAlertingMetrics();

    // Reset consecutive failures on success
    if (metrics.consecutiveFailures > 0) {
      metrics.consecutiveFailures = 0;
      await this.updateAlertingMetrics(metrics);

      console.log("Schema validation recovered after failures");
    }
  }

  private async sendAlert(
    result: SchemaValidationResult,
    metrics: AlertingMetrics
  ): Promise<void> {
    const alertMessage = {
      type: "SCHEMA_VALIDATION_FAILURE",
      severity: "HIGH",
      timestamp: new Date().toISOString(),
      consecutiveFailures: metrics.consecutiveFailures,
      totalFailures: metrics.totalFailures,
      errors: result.errors,
      missingTables: result.missingTables,
      extraTables: result.extraTables,
    };

    // Log the alert (in production, this would integrate with your alerting system)
    console.error("🚨 SCHEMA VALIDATION ALERT:", alertMessage);

    // In a real implementation, you would:
    // 1. Send to monitoring service (e.g., Sentry, DataDog)
    // 2. Send email/SMS to on-call engineers
    // 3. Post to Slack/Discord/Teams
    // 4. Trigger PagerDuty incident

    // Example webhook call (commented out):
    /*
    try {
      await fetch("https://hooks.slack.com/your-webhook-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 Database Schema Validation Failed (${metrics.consecutiveFailures} consecutive failures)`,
          attachments: [{
            color: "danger",
            fields: [
              { title: "Errors", value: result.errors?.join("\n") || "None", short: false },
              { title: "Missing Tables", value: result.missingTables?.join(", ") || "None", short: true },
              { title: "Extra Tables", value: result.extraTables?.join(", ") || "None", short: true }
            ]
          }]
        })
      });
    } catch (error) {
      console.error("Failed to send alert webhook:", error);
    }
    */
  }

  async getMonitoringMetrics(): Promise<{
    isHealthy: boolean;
    metrics: AlertingMetrics;
    lastValidationResult?: SchemaValidationResult;
  }> {
    const metrics = await this.getAlertingMetrics();
    const lastValidationResult = await this.runFullValidation();

    return {
      isHealthy:
        lastValidationResult.isValid && metrics.consecutiveFailures === 0,
      metrics,
      lastValidationResult,
    };
  }
}
