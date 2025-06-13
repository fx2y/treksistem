import { vehicles, orders } from "@treksistem/db";
import { eq, and, gt, asc } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

import { AuditService } from "./audit.service";

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export interface VehicleResponse {
  id: string;
  licensePlate: string;
  description: string | null;
  createdAt: string;
}

export interface PaginatedVehicleResponse {
  data: VehicleResponse[];
  nextCursor: string | null;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  description?: string;
}

export interface UpdateVehicleRequest {
  licensePlate?: string;
  description?: string;
}

export class VehicleService {
  constructor(
    private db: DrizzleD1Database,
    private auditService?: AuditService
  ) {}

  async getVehicles(
    mitraId: string,
    options: { limit: number; cursor?: string } = { limit: 20 }
  ): Promise<PaginatedVehicleResponse> {
    const { limit, cursor } = options;

    // Build query conditions
    const conditions = [eq(vehicles.mitraId, mitraId)];
    if (cursor) {
      conditions.push(gt(vehicles.id, cursor));
    }

    // Fetch limit + 1 to determine if there's a next page
    const result = await this.db
      .select({
        id: vehicles.id,
        licensePlate: vehicles.licensePlate,
        description: vehicles.description,
        createdAt: vehicles.createdAt,
      })
      .from(vehicles)
      .where(and(...conditions))
      .orderBy(asc(vehicles.id))
      .limit(limit + 1);

    // Determine if there's a next page
    const hasMore = result.length > limit;
    const data = hasMore ? result.slice(0, limit) : result;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return {
      data: data.map(vehicle => ({
        ...vehicle,
        createdAt: vehicle.createdAt!.toISOString(),
      })),
      nextCursor,
    };
  }

  async getVehicleById(
    mitraId: string,
    vehicleId: string
  ): Promise<VehicleResponse | null> {
    const result = await this.db
      .select({
        id: vehicles.id,
        licensePlate: vehicles.licensePlate,
        description: vehicles.description,
        createdAt: vehicles.createdAt,
      })
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.mitraId, mitraId)))
      .limit(1);

    if (result.length === 0) return null;

    const vehicle = result[0];
    return {
      ...vehicle,
      createdAt: vehicle.createdAt!.toISOString(),
    };
  }

  async createVehicle(
    mitraId: string,
    data: CreateVehicleRequest
  ): Promise<VehicleResponse> {
    const normalizedLicensePlate = data.licensePlate
      .toUpperCase()
      .trim()
      .replace(/\s+/g, "");

    const result = await this.db
      .insert(vehicles)
      .values({
        mitraId,
        licensePlate: normalizedLicensePlate,
        description: data.description || null,
      })
      .returning({
        id: vehicles.id,
        licensePlate: vehicles.licensePlate,
        description: vehicles.description,
        createdAt: vehicles.createdAt,
      });

    const vehicle = result[0];

    // Audit log the vehicle creation
    if (this.auditService) {
      await this.auditService.log({
        actorId: mitraId,
        mitraId,
        entityType: "VEHICLE",
        entityId: vehicle.id,
        eventType: "VEHICLE_CREATED",
        details: {
          licensePlate: vehicle.licensePlate,
          description: vehicle.description,
        },
      });
    }

    return {
      ...vehicle,
      createdAt: vehicle.createdAt!.toISOString(),
    };
  }

  async updateVehicle(
    mitraId: string,
    vehicleId: string,
    data: UpdateVehicleRequest
  ): Promise<VehicleResponse> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.licensePlate !== undefined) {
      updateData.licensePlate = data.licensePlate
        .toUpperCase()
        .trim()
        .replace(/\s+/g, "");
    }
    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }

    const result = await this.db
      .update(vehicles)
      .set(updateData)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.mitraId, mitraId)))
      .returning({
        id: vehicles.id,
        licensePlate: vehicles.licensePlate,
        description: vehicles.description,
        createdAt: vehicles.createdAt,
      });

    if (result.length === 0) {
      throw new Error("Vehicle not found");
    }

    const vehicle = result[0];

    // Audit log the vehicle update
    if (this.auditService) {
      await this.auditService.log({
        actorId: mitraId,
        mitraId,
        entityType: "VEHICLE",
        entityId: vehicle.id,
        eventType: "VEHICLE_UPDATED",
        details: {
          licensePlate: vehicle.licensePlate,
          description: vehicle.description,
          changes: data,
        },
      });
    }

    return {
      ...vehicle,
      createdAt: vehicle.createdAt!.toISOString(),
    };
  }

  async deleteVehicle(
    mitraId: string,
    vehicleId: string
  ): Promise<{ success: boolean }> {
    // Check for active orders assigned to this vehicle
    const activeOrders = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.assignedVehicleId, vehicleId),
          eq(orders.status, "in_transit")
        )
      )
      .limit(1);

    if (activeOrders.length > 0) {
      throw new ConflictError(
        "Cannot delete a vehicle that is currently assigned to an active order."
      );
    }

    const result = await this.db
      .delete(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.mitraId, mitraId)))
      .returning({ id: vehicles.id });

    const success = result.length > 0;

    // Audit log the vehicle deletion
    if (success && this.auditService) {
      await this.auditService.log({
        actorId: mitraId,
        mitraId,
        entityType: "VEHICLE",
        entityId: vehicleId,
        eventType: "VEHICLE_DELETED",
        details: {},
      });
    }

    return { success };
  }
}
