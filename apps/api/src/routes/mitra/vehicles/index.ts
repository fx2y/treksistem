import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import type { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

import { AuditService } from "../../../services/audit.service";
import {
  VehicleService,
  ConflictError,
} from "../../../services/vehicle.service";

import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleParamsSchema,
  paginationQuerySchema,
} from "./validation";

const vehicles = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
    db: ReturnType<typeof drizzle>;
    mitraId: string;
    userId: string;
  };
}>();

vehicles.get("/", zValidator("query", paginationQuerySchema), async c => {
  const db = c.get("db");
  const mitraId = c.get("mitraId");
  const { limit, cursor } = c.req.valid("query");

  const auditService = new AuditService(db);
  const vehicleService = new VehicleService(db, auditService);
  const result = await vehicleService.getVehicles(mitraId, { limit, cursor });

  return c.json(result);
});

vehicles.get(
  "/:vehicleId",
  zValidator("param", vehicleParamsSchema),
  async c => {
    const db = c.get("db");
    const mitraId = c.get("mitraId");
    const { vehicleId } = c.req.valid("param");

    const auditService = new AuditService(db);
    const vehicleService = new VehicleService(db, auditService);
    const vehicle = await vehicleService.getVehicleById(mitraId, vehicleId);

    if (!vehicle) {
      return c.json({ error: "Vehicle not found" }, 404);
    }

    return c.json(vehicle);
  }
);

vehicles.post("/", zValidator("json", createVehicleSchema), async c => {
  const db = c.get("db");
  const mitraId = c.get("mitraId");
  const data = c.req.valid("json");

  const auditService = new AuditService(db);
  const vehicleService = new VehicleService(db, auditService);
  const vehicle = await vehicleService.createVehicle(mitraId, data);

  return c.json(vehicle, 201);
});

vehicles.put(
  "/:vehicleId",
  zValidator("param", vehicleParamsSchema),
  zValidator("json", updateVehicleSchema),
  async c => {
    const db = c.get("db");
    const mitraId = c.get("mitraId");
    const { vehicleId } = c.req.valid("param");
    const data = c.req.valid("json");

    const auditService = new AuditService(db);
    const vehicleService = new VehicleService(db, auditService);

    try {
      const vehicle = await vehicleService.updateVehicle(
        mitraId,
        vehicleId,
        data
      );
      return c.json(vehicle);
    } catch (error) {
      if (error instanceof Error && error.message === "Vehicle not found") {
        return c.json({ error: "Vehicle not found" }, 404);
      }
      throw error;
    }
  }
);

vehicles.delete(
  "/:vehicleId",
  zValidator("param", vehicleParamsSchema),
  async c => {
    const db = c.get("db");
    const mitraId = c.get("mitraId");
    const { vehicleId } = c.req.valid("param");

    const auditService = new AuditService(db);
    const vehicleService = new VehicleService(db, auditService);

    try {
      const result = await vehicleService.deleteVehicle(mitraId, vehicleId);

      if (!result.success) {
        return c.json({ error: "Vehicle not found" }, 404);
      }

      return c.body(null, 204);
    } catch (error) {
      if (error instanceof ConflictError) {
        return c.json({ error: error.message }, 409);
      }
      throw error;
    }
  }
);

export default vehicles;
