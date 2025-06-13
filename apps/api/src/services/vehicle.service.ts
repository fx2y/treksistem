import { vehicles } from "@treksistem/db";
import { eq, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export interface VehicleResponse {
  id: string;
  licensePlate: string;
  description: string | null;
  createdAt: string;
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
  constructor(private db: DrizzleD1Database) {}

  async getVehicles(mitraId: string): Promise<VehicleResponse[]> {
    const result = await this.db
      .select({
        id: vehicles.id,
        licensePlate: vehicles.licensePlate,
        description: vehicles.description,
        createdAt: vehicles.createdAt,
      })
      .from(vehicles)
      .where(eq(vehicles.mitraId, mitraId));

    return result.map(vehicle => ({
      ...vehicle,
      createdAt: vehicle.createdAt!.toISOString(),
    }));
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
    const normalizedLicensePlate = data.licensePlate.toUpperCase().trim();

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
      updateData.licensePlate = data.licensePlate.toUpperCase().trim();
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
    return {
      ...vehicle,
      createdAt: vehicle.createdAt!.toISOString(),
    };
  }

  async deleteVehicle(
    mitraId: string,
    vehicleId: string
  ): Promise<{ success: boolean }> {
    const result = await this.db
      .delete(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.mitraId, mitraId)))
      .returning({ id: vehicles.id });

    return { success: result.length > 0 };
  }
}
