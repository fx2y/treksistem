import type { DbClient as Database } from "@treksistem/db";
import {
  services,
  serviceRates,
  masterVehicleTypes,
  masterPayloadTypes,
  masterFacilities,
} from "@treksistem/db";
import { eq, and, inArray } from "drizzle-orm";
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
  rate: {
    id: string;
    baseFee: number;
    feePerKm: number;
  };
  supportedVehicleTypes: Array<{
    id: string;
    name: string;
    icon: string | null;
  }>;
  supportedPayloadTypes: Array<{
    id: string;
    name: string;
    icon: string | null;
  }>;
  availableFacilities: Array<{ id: string; name: string; icon: string | null }>;
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
    const serviceId = nanoid();

    // Insert service
    await this.db.insert(services).values({
      id: serviceId,
      mitraId,
      name: data.name,
      isPublic: data.isPublic,
      maxRangeKm: data.maxRangeKm,
    });

    // Insert service rates
    const rateId = nanoid();
    await this.db.insert(serviceRates).values({
      id: rateId,
      serviceId,
      baseFee: data.rate.baseFee,
      feePerKm: data.rate.feePerKm,
    });

    // Insert vehicle type relationships
    if (data.supportedVehicleTypeIds.length > 0) {
      await this.db.insert(servicesToVehicleTypes).values(
        data.supportedVehicleTypeIds.map(vehicleTypeId => ({
          serviceId,
          vehicleTypeId,
        }))
      );
    }

    // Insert payload type relationships
    if (data.supportedPayloadTypeIds.length > 0) {
      await this.db.insert(servicesToPayloadTypes).values(
        data.supportedPayloadTypeIds.map(payloadTypeId => ({
          serviceId,
          payloadTypeId,
        }))
      );
    }

    // Insert facility relationships
    if (data.availableFacilityIds && data.availableFacilityIds.length > 0) {
      await this.db.insert(servicesToFacilities).values(
        data.availableFacilityIds.map(facilityId => ({
          serviceId,
          facilityId,
        }))
      );
    }

    // Return the created service with related data
    const createdService = await this.getServiceById(mitraId, serviceId);
    if (!createdService) {
      throw new Error("Failed to retrieve created service");
    }
    return createdService;
  }

  async getServices(mitraId: string): Promise<ServiceResponse[]> {
    const servicesWithRates = await this.db
      .select({
        service: services,
        rate: serviceRates,
      })
      .from(services)
      .leftJoin(serviceRates, eq(services.id, serviceRates.serviceId))
      .where(eq(services.mitraId, mitraId));

    if (servicesWithRates.length === 0) {
      return [];
    }

    // Get related data for all services
    const serviceIds = servicesWithRates.map(row => row.service.id);

    const [vehicleTypeLinks, payloadTypeLinks, facilityLinks] =
      await Promise.all([
        this.db
          .select({
            serviceId: servicesToVehicleTypes.serviceId,
            vehicleType: masterVehicleTypes,
          })
          .from(servicesToVehicleTypes)
          .innerJoin(
            masterVehicleTypes,
            eq(servicesToVehicleTypes.vehicleTypeId, masterVehicleTypes.id)
          )
          .where(inArray(servicesToVehicleTypes.serviceId, serviceIds)),
        this.db
          .select({
            serviceId: servicesToPayloadTypes.serviceId,
            payloadType: masterPayloadTypes,
          })
          .from(servicesToPayloadTypes)
          .innerJoin(
            masterPayloadTypes,
            eq(servicesToPayloadTypes.payloadTypeId, masterPayloadTypes.id)
          )
          .where(inArray(servicesToPayloadTypes.serviceId, serviceIds)),
        this.db
          .select({
            serviceId: servicesToFacilities.serviceId,
            facility: masterFacilities,
          })
          .from(servicesToFacilities)
          .innerJoin(
            masterFacilities,
            eq(servicesToFacilities.facilityId, masterFacilities.id)
          )
          .where(inArray(servicesToFacilities.serviceId, serviceIds)),
      ]);

    // Group by service ID
    const vehicleTypesByService = new Map<
      string,
      Array<{ id: string; name: string; icon: string | null }>
    >();
    const payloadTypesByService = new Map<
      string,
      Array<{ id: string; name: string; icon: string | null }>
    >();
    const facilitiesByService = new Map<
      string,
      Array<{ id: string; name: string; icon: string | null }>
    >();

    vehicleTypeLinks.forEach(link => {
      if (!vehicleTypesByService.has(link.serviceId)) {
        vehicleTypesByService.set(link.serviceId, []);
      }
      vehicleTypesByService.get(link.serviceId)!.push({
        id: link.vehicleType.id,
        name: link.vehicleType.name,
        icon: link.vehicleType.icon,
      });
    });

    payloadTypeLinks.forEach(link => {
      if (!payloadTypesByService.has(link.serviceId)) {
        payloadTypesByService.set(link.serviceId, []);
      }
      payloadTypesByService.get(link.serviceId)!.push({
        id: link.payloadType.id,
        name: link.payloadType.name,
        icon: link.payloadType.icon,
      });
    });

    facilityLinks.forEach(link => {
      if (!facilitiesByService.has(link.serviceId)) {
        facilitiesByService.set(link.serviceId, []);
      }
      facilitiesByService.get(link.serviceId)!.push({
        id: link.facility.id,
        name: link.facility.name,
        icon: link.facility.icon,
      });
    });

    return servicesWithRates.map(row => ({
      id: row.service.id,
      mitraId: row.service.mitraId,
      name: row.service.name,
      isPublic: row.service.isPublic,
      maxRangeKm: row.service.maxRangeKm,
      rate: {
        id: row.rate?.id || "",
        baseFee: row.rate?.baseFee || 0,
        feePerKm: row.rate?.feePerKm || 0,
      },
      supportedVehicleTypes: vehicleTypesByService.get(row.service.id) || [],
      supportedPayloadTypes: payloadTypesByService.get(row.service.id) || [],
      availableFacilities: facilitiesByService.get(row.service.id) || [],
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

    // Get related data for this service
    const [vehicleTypeLinks, payloadTypeLinks, facilityLinks] =
      await Promise.all([
        this.db
          .select({
            vehicleType: masterVehicleTypes,
          })
          .from(servicesToVehicleTypes)
          .innerJoin(
            masterVehicleTypes,
            eq(servicesToVehicleTypes.vehicleTypeId, masterVehicleTypes.id)
          )
          .where(eq(servicesToVehicleTypes.serviceId, serviceId)),
        this.db
          .select({
            payloadType: masterPayloadTypes,
          })
          .from(servicesToPayloadTypes)
          .innerJoin(
            masterPayloadTypes,
            eq(servicesToPayloadTypes.payloadTypeId, masterPayloadTypes.id)
          )
          .where(eq(servicesToPayloadTypes.serviceId, serviceId)),
        this.db
          .select({
            facility: masterFacilities,
          })
          .from(servicesToFacilities)
          .innerJoin(
            masterFacilities,
            eq(servicesToFacilities.facilityId, masterFacilities.id)
          )
          .where(eq(servicesToFacilities.serviceId, serviceId)),
      ]);

    return {
      id: row.service.id,
      mitraId: row.service.mitraId,
      name: row.service.name,
      isPublic: row.service.isPublic,
      maxRangeKm: row.service.maxRangeKm,
      rate: {
        id: row.rate?.id || "",
        baseFee: row.rate?.baseFee || 0,
        feePerKm: row.rate?.feePerKm || 0,
      },
      supportedVehicleTypes: vehicleTypeLinks.map(link => ({
        id: link.vehicleType.id,
        name: link.vehicleType.name,
        icon: link.vehicleType.icon,
      })),
      supportedPayloadTypes: payloadTypeLinks.map(link => ({
        id: link.payloadType.id,
        name: link.payloadType.name,
        icon: link.payloadType.icon,
      })),
      availableFacilities: facilityLinks.map(link => ({
        id: link.facility.id,
        name: link.facility.name,
        icon: link.facility.icon,
      })),
    };
  }

  async updateService(
    mitraId: string,
    serviceId: string,
    data: UpdateServiceRequest
  ): Promise<ServiceResponse> {
    // Update service if any service fields are provided
    const serviceUpdateData: any = {};
    if (data.name !== undefined) serviceUpdateData.name = data.name;
    if (data.isPublic !== undefined) serviceUpdateData.isPublic = data.isPublic;
    if (data.maxRangeKm !== undefined)
      serviceUpdateData.maxRangeKm = data.maxRangeKm;

    if (Object.keys(serviceUpdateData).length > 0) {
      await this.db
        .update(services)
        .set(serviceUpdateData)
        .where(and(eq(services.id, serviceId), eq(services.mitraId, mitraId)));
    }

    // Update rates if provided
    if (data.rate) {
      await this.db
        .update(serviceRates)
        .set({
          baseFee: data.rate.baseFee,
          feePerKm: data.rate.feePerKm,
        })
        .where(eq(serviceRates.serviceId, serviceId));
    }

    // Update vehicle type relationships if provided
    if (data.supportedVehicleTypeIds !== undefined) {
      // Delete existing relationships
      await this.db
        .delete(servicesToVehicleTypes)
        .where(eq(servicesToVehicleTypes.serviceId, serviceId));

      // Insert new relationships
      if (data.supportedVehicleTypeIds.length > 0) {
        await this.db.insert(servicesToVehicleTypes).values(
          data.supportedVehicleTypeIds.map(vehicleTypeId => ({
            serviceId,
            vehicleTypeId,
          }))
        );
      }
    }

    // Update payload type relationships if provided
    if (data.supportedPayloadTypeIds !== undefined) {
      // Delete existing relationships
      await this.db
        .delete(servicesToPayloadTypes)
        .where(eq(servicesToPayloadTypes.serviceId, serviceId));

      // Insert new relationships
      if (data.supportedPayloadTypeIds.length > 0) {
        await this.db.insert(servicesToPayloadTypes).values(
          data.supportedPayloadTypeIds.map(payloadTypeId => ({
            serviceId,
            payloadTypeId,
          }))
        );
      }
    }

    // Update facility relationships if provided
    if (data.availableFacilityIds !== undefined) {
      // Delete existing relationships
      await this.db
        .delete(servicesToFacilities)
        .where(eq(servicesToFacilities.serviceId, serviceId));

      // Insert new relationships
      if (data.availableFacilityIds && data.availableFacilityIds.length > 0) {
        await this.db.insert(servicesToFacilities).values(
          data.availableFacilityIds.map(facilityId => ({
            serviceId,
            facilityId,
          }))
        );
      }
    }

    // Return updated service
    const updatedService = await this.getServiceById(mitraId, serviceId);
    if (!updatedService) {
      throw new Error("Service not found after update");
    }
    return updatedService;
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
