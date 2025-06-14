import { Hono } from "hono";

import type { ServiceContainer } from "../../services/factory";

const schema = new Hono<{
  Variables: {
    services: ServiceContainer;
  };
}>();

// Validate database schema
schema.get("/validate", async c => {
  const { schemaValidationService } = c.get("services");
  const result = await schemaValidationService.runFullValidation();

  if (!result.isValid) {
    return c.json(result, 422);
  }

  return c.json({
    message: "Schema validation passed",
    result,
  });
});

// Get schema information
schema.get("/info", async c => {
  const { schemaValidationService } = c.get("services");
  const result = await schemaValidationService.validateSchema();

  return c.json({
    message: "Schema information",
    result,
  });
});

// Check foreign key constraints
schema.get("/foreign-keys", async c => {
  const { schemaValidationService } = c.get("services");
  const result = await schemaValidationService.checkForeignKeyConstraints();

  if (!result.isValid) {
    return c.json(result, 422);
  }

  return c.json({
    message: "Foreign key constraints are valid",
    result,
  });
});

export default schema;
