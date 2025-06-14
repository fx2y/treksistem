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

  const service = await mitraServiceManagementService.createService(
    mitraId,
    data
  );
  return c.json(service, 201);
});

// Get all services for the authenticated mitra
app.get("/", async c => {
  const mitraId = c.get("mitraId");
  const { mitraServiceManagementService } = c.get("services");

  const services = await mitraServiceManagementService.getServices(mitraId);
  return c.json(services);
});

// Get a specific service by ID
app.get("/:serviceId", async c => {
  const mitraId = c.get("mitraId");
  const serviceId = c.req.param("serviceId");
  const { mitraServiceManagementService } = c.get("services");

  const service = await mitraServiceManagementService.getServiceById(
    mitraId,
    serviceId
  );
  return c.json(service);
});

// Update a service
app.put("/:serviceId", zValidator("json", updateServiceSchema), async c => {
  const mitraId = c.get("mitraId");
  const serviceId = c.req.param("serviceId");
  const data = c.req.valid("json");
  const { mitraServiceManagementService } = c.get("services");

  const service = await mitraServiceManagementService.updateService(
    mitraId,
    serviceId,
    data
  );
  return c.json(service);
});

export default app;
