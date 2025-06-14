import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { ServiceContainer } from "../../../services/factory";
import { ConflictError } from "../../../services/vehicle.service";

import {
  createVehicleSchema,
  updateVehicleSchema,
  vehicleParamsSchema,
  paginationQuerySchema,
} from "./validation";

const vehicles = new Hono<{
  Variables: {
    services: ServiceContainer;
    mitraId: string;
    userId: string;
  };
}>();

vehicles.get("/", zValidator("query", paginationQuerySchema), async c => {
  const mitraId = c.get("mitraId");
  const { limit, cursor } = c.req.valid("query");

  const { vehicleService } = c.get("services");
  const result = await vehicleService.getVehicles(mitraId, { limit, cursor });

  return c.json(result);
});

vehicles.get(
  "/:vehicleId",
  zValidator("param", vehicleParamsSchema),
  async c => {
    const mitraId = c.get("mitraId");
    const { vehicleId } = c.req.valid("param");

    const { vehicleService } = c.get("services");
    const vehicle = await vehicleService.getVehicleById(mitraId, vehicleId);

    if (!vehicle) {
      return c.json({ error: "Vehicle not found" }, 404);
    }

    return c.json(vehicle);
  }
);

vehicles.post("/", zValidator("json", createVehicleSchema), async c => {
  const mitraId = c.get("mitraId");
  const data = c.req.valid("json");

  const { vehicleService } = c.get("services");
  const vehicle = await vehicleService.createVehicle(mitraId, data);

  return c.json(vehicle, 201);
});

vehicles.put(
  "/:vehicleId",
  zValidator("param", vehicleParamsSchema),
  zValidator("json", updateVehicleSchema),
  async c => {
    const mitraId = c.get("mitraId");
    const { vehicleId } = c.req.valid("param");
    const data = c.req.valid("json");

    const { vehicleService } = c.get("services");

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
    const mitraId = c.get("mitraId");
    const { vehicleId } = c.req.valid("param");

    const { vehicleService } = c.get("services");

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
