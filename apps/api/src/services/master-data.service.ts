import type { DbClient } from "@treksistem/db";
import {
  masterVehicleTypes,
  masterPayloadTypes,
  masterFacilities,
} from "@treksistem/db";

export interface MasterDataResponse {
  vehicles: Array<{ id: string; name: string; icon: string | null }>;
  payloads: Array<{ id: string; name: string; icon: string | null }>;
  facilities: Array<{ id: string; name: string; icon: string | null }>;
}

export class MasterDataService {
  constructor(private db: DbClient) {}

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
