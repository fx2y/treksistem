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
