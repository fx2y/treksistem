import type { Database } from "@treksistem/db";
import {
  services,
  serviceRates,
  masterVehicleTypes,
  masterPayloadTypes,
  masterFacilities,
} from "@treksistem/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface CreateServiceRequest {
  name: string;
  isPublic: boolean;
  maxRangeKm: number | null;
  supportedVehicleTypeIds: string[];
  supportedPayloadTypeIds: string[];
  availableFacilityIds: string[] | null;
  rate: {
    baseFee: number;
    feePerKm: number;
  };
}

export interface UpdateServiceRequest {
  name?: string;
  isPublic?: boolean;
  maxRangeKm?: number | null;
  supportedVehicleTypeIds?: string[];
  supportedPayloadTypeIds?: string[];
  availableFacilityIds?: string[] | null;
  rate?: {
    baseFee: number;
    feePerKm: number;
  };
}

export interface ServiceResponse {
  id: string;
  mitraId: string;
  name: string;
  isPublic: boolean;
  maxRangeKm: number | null;
  supportedVehicleTypeIds: string[];
  supportedPayloadTypeIds: string[];
  availableFacilityIds: string[] | null;
  rate: {
    id: string;
    baseFee: number;
    feePerKm: number;
  };
}

export interface MasterDataResponse {
  vehicles: Array<{ id: string; name: string; icon: string | null }>;
  payloads: Array<{ id: string; name: string; icon: string | null }>;
  facilities: Array<{ id: string; name: string; icon: string | null }>;
}

export class MitraService {
  constructor(private db: Database) {}

  async createService(
    mitraId: string,
    data: CreateServiceRequest
  ): Promise<ServiceResponse> {
    return await this.db.transaction(async tx => {
      const serviceId = nanoid();

      // Insert service
      await tx.insert(services).values({
        id: serviceId,
        mitraId,
        name: data.name,
        isPublic: data.isPublic,
        maxRangeKm: data.maxRangeKm,
        supportedVehicleTypeIds: data.supportedVehicleTypeIds,
        supportedPayloadTypeIds: data.supportedPayloadTypeIds,
        availableFacilityIds: data.availableFacilityIds,
      });

      // Insert service rates
      const rateId = nanoid();
      await tx.insert(serviceRates).values({
        id: rateId,
        serviceId,
        baseFee: data.rate.baseFee,
        feePerKm: data.rate.feePerKm,
      });

      return {
        id: serviceId,
        mitraId,
        name: data.name,
        isPublic: data.isPublic,
        maxRangeKm: data.maxRangeKm,
        supportedVehicleTypeIds: data.supportedVehicleTypeIds,
        supportedPayloadTypeIds: data.supportedPayloadTypeIds,
        availableFacilityIds: data.availableFacilityIds,
        rate: {
          id: rateId,
          baseFee: data.rate.baseFee,
          feePerKm: data.rate.feePerKm,
        },
      };
    });
  }

  async getServices(mitraId: string): Promise<ServiceResponse[]> {
    const result = await this.db
      .select({
        service: services,
        rate: serviceRates,
      })
      .from(services)
      .leftJoin(serviceRates, eq(services.id, serviceRates.serviceId))
      .where(eq(services.mitraId, mitraId));

    return result.map(row => ({
      id: row.service.id,
      mitraId: row.service.mitraId,
      name: row.service.name,
      isPublic: row.service.isPublic,
      maxRangeKm: row.service.maxRangeKm,
      supportedVehicleTypeIds: row.service.supportedVehicleTypeIds || [],
      supportedPayloadTypeIds: row.service.supportedPayloadTypeIds || [],
      availableFacilityIds: row.service.availableFacilityIds || [],
      rate: {
        id: row.rate?.id || "",
        baseFee: row.rate?.baseFee || 0,
        feePerKm: row.rate?.feePerKm || 0,
      },
    }));
  }

  async getServiceById(
    mitraId: string,
    serviceId: string
  ): Promise<ServiceResponse | null> {
    const result = await this.db
      .select({
        service: services,
        rate: serviceRates,
      })
      .from(services)
      .leftJoin(serviceRates, eq(services.id, serviceRates.serviceId))
      .where(and(eq(services.id, serviceId), eq(services.mitraId, mitraId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.service.id,
      mitraId: row.service.mitraId,
      name: row.service.name,
      isPublic: row.service.isPublic,
      maxRangeKm: row.service.maxRangeKm,
      supportedVehicleTypeIds: row.service.supportedVehicleTypeIds || [],
      supportedPayloadTypeIds: row.service.supportedPayloadTypeIds || [],
      availableFacilityIds: row.service.availableFacilityIds || [],
      rate: {
        id: row.rate?.id || "",
        baseFee: row.rate?.baseFee || 0,
        feePerKm: row.rate?.feePerKm || 0,
      },
    };
  }

  async updateService(
    mitraId: string,
    serviceId: string,
    data: UpdateServiceRequest
  ): Promise<ServiceResponse> {
    return await this.db.transaction(async tx => {
      // Update service if any service fields are provided
      const serviceUpdateData: any = {};
      if (data.name !== undefined) serviceUpdateData.name = data.name;
      if (data.isPublic !== undefined)
        serviceUpdateData.isPublic = data.isPublic;
      if (data.maxRangeKm !== undefined)
        serviceUpdateData.maxRangeKm = data.maxRangeKm;
      if (data.supportedVehicleTypeIds !== undefined)
        serviceUpdateData.supportedVehicleTypeIds =
          data.supportedVehicleTypeIds;
      if (data.supportedPayloadTypeIds !== undefined)
        serviceUpdateData.supportedPayloadTypeIds =
          data.supportedPayloadTypeIds;
      if (data.availableFacilityIds !== undefined)
        serviceUpdateData.availableFacilityIds = data.availableFacilityIds;

      if (Object.keys(serviceUpdateData).length > 0) {
        await tx
          .update(services)
          .set(serviceUpdateData)
          .where(
            and(eq(services.id, serviceId), eq(services.mitraId, mitraId))
          );
      }

      // Update rates if provided
      if (data.rate) {
        await tx
          .update(serviceRates)
          .set({
            baseFee: data.rate.baseFee,
            feePerKm: data.rate.feePerKm,
          })
          .where(eq(serviceRates.serviceId, serviceId));
      }

      // Return updated service
      const updatedService = await this.getServiceById(mitraId, serviceId);
      if (!updatedService) {
        throw new Error("Service not found after update");
      }
      return updatedService;
    });
  }

  async getMasterData(): Promise<MasterDataResponse> {
    const [vehicleTypes, payloadTypes, facilities] = await Promise.all([
      this.db.select().from(masterVehicleTypes),
      this.db.select().from(masterPayloadTypes),
      this.db.select().from(masterFacilities),
    ]);

    return {
      vehicles: vehicleTypes.map(v => ({
        id: v.id,
        name: v.name,
        icon: v.icon,
      })),
      payloads: payloadTypes.map(p => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
      })),
      facilities: facilities.map(f => ({
        id: f.id,
        name: f.name,
        icon: f.icon,
      })),
    };
  }
}
