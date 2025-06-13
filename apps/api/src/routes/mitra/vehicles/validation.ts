import { z } from "zod";

export const createVehicleSchema = z.object({
  licensePlate: z.string().min(1, "License plate is required").trim(),
  description: z.string().optional(),
});

export const updateVehicleSchema = z.object({
  licensePlate: z
    .string()
    .min(1, "License plate is required")
    .trim()
    .optional(),
  description: z.string().optional(),
});

export const vehicleParamsSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
