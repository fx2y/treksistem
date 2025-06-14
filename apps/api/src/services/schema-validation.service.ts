import type { DbClient } from "@treksistem/db";
import { BadRequestError } from "../lib/errors";

export interface SchemaValidationServiceDependencies {
  db: DbClient;
}

export interface SchemaValidationResult {
  isValid: boolean;
  missingTables?: string[];
  extraTables?: string[];
  errors?: string[];
}

export class SchemaValidationService {
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
    "invoices"
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
        errors: [`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
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

  async checkForeignKeyConstraints(): Promise<{ isValid: boolean; errors?: string[] }> {
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
          errors: violations.map((v: any) => 
            `Foreign key violation in table ${v.table}, rowid ${v.rowid}`
          ),
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Foreign key check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
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
      const errorMessage = [
        "Database schema validation failed:",
        ...(result.errors || []),
        result.missingTables ? `Missing tables: ${result.missingTables.join(", ")}` : null,
        result.extraTables ? `Extra tables: ${result.extraTables.join(", ")}` : null,
      ].filter(Boolean).join("\n");
      
      throw new BadRequestError(
        errorMessage,
        "SCHEMA_VALIDATION_FAILED"
      );
    }
  }
}