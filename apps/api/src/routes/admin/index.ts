import { Hono } from "hono";

import type { ServiceContainer } from "../../services/factory";

import schemaRoutes from "./schema";

const admin = new Hono<{
  Variables: {
    services: ServiceContainer;
  };
}>();

// Schema management routes
admin.route("/schema", schemaRoutes);

// Health check with schema validation
admin.get("/health", async c => {
  const { schemaValidationService } = c.get("services");

  try {
    const schemaResult = await schemaValidationService.validateSchema();

    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      schema: {
        isValid: schemaResult.isValid,
        issues: {
          missingTables: schemaResult.missingTables?.length || 0,
          extraTables: schemaResult.extraTables?.length || 0,
          errors: schemaResult.errors?.length || 0,
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default admin;
