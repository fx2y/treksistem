import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { ServiceContainer } from "../../services/factory";

const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  isPublic: z.boolean(),
  maxRangeKm: z.number().positive().nullable(),
  supportedVehicleTypeIds: z.array(z.string()),
  supportedPayloadTypeIds: z.array(z.string()),
  availableFacilityIds: z.array(z.string()).nullable(),
  rate: z.object({
    baseFee: z.number().int().min(0),
    feePerKm: z.number().int().min(0),
  }),
});

const updateServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isPublic: z.boolean().optional(),
  maxRangeKm: z.number().positive().nullable().optional(),
  supportedVehicleTypeIds: z.array(z.string()).optional(),
  supportedPayloadTypeIds: z.array(z.string()).optional(),
  availableFacilityIds: z.array(z.string()).nullable().optional(),
  rate: z
    .object({
      baseFee: z.number().int().min(0),
      feePerKm: z.number().int().min(0),
    })
    .optional(),
});

const app = new Hono<{
  Variables: {
    services: ServiceContainer;
    mitraId: string;
  };
}>();

// Create a new service
app.post("/", zValidator("json", createServiceSchema), async c => {
  const mitraId = c.get("mitraId");
  const data = c.req.valid("json");
  const { mitraServiceManagementService } = c.get("services");

  try {
    const service = await mitraServiceManagementService.createService(
      mitraId,
      data
    );
    return c.json(service, 201);
  } catch (error) {
    console.error("Error creating service:", error);
    return c.json({ error: "Failed to create service" }, 500);
  }
});

// Get all services for the authenticated mitra
app.get("/", async c => {
  const mitraId = c.get("mitraId");
  const { mitraServiceManagementService } = c.get("services");

  try {
    const services = await mitraServiceManagementService.getServices(mitraId);
    return c.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return c.json({ error: "Failed to fetch services" }, 500);
  }
});

// Get a specific service by ID
app.get("/:serviceId", async c => {
  const mitraId = c.get("mitraId");
  const serviceId = c.req.param("serviceId");
  const { mitraServiceManagementService } = c.get("services");

  try {
    const service = await mitraServiceManagementService.getServiceById(
      mitraId,
      serviceId
    );
    if (!service) {
      return c.json({ error: "Service not found" }, 404);
    }
    return c.json(service);
  } catch (error) {
    console.error("Error fetching service:", error);
    return c.json({ error: "Failed to fetch service" }, 500);
  }
});

// Update a service
app.put("/:serviceId", zValidator("json", updateServiceSchema), async c => {
  const mitraId = c.get("mitraId");
  const serviceId = c.req.param("serviceId");
  const data = c.req.valid("json");
  const { mitraServiceManagementService } = c.get("services");

  try {
    const service = await mitraServiceManagementService.updateService(
      mitraId,
      serviceId,
      data
    );
    return c.json(service);
  } catch (error) {
    console.error("Error updating service:", error);
    if (
      error instanceof Error &&
      error.message === "Service not found after update"
    ) {
      return c.json({ error: "Service not found" }, 404);
    }
    return c.json({ error: "Failed to update service" }, 500);
  }
});

export default app;
