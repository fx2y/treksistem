import { z } from "zod";

export const logbookQuerySchema = z.object({
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
});

export type LogbookQueryRequest = z.infer<typeof logbookQuerySchema>;