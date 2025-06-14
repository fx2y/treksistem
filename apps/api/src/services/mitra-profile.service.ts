import { mitras } from "@treksistem/db";
import { eq } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/d1";

export interface MitraProfileDTO {
  id: string;
  businessName: string;
  address: string | null;
  phone: string | null;
}

export interface UpdateMitraProfileData {
  businessName: string;
  address?: string;
  phone?: string;
}

export class MitraProfileService {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async getProfile(mitraId: string): Promise<MitraProfileDTO | null> {
    const [mitra] = await this.db
      .select({
        id: mitras.id,
        businessName: mitras.businessName,
        address: mitras.address,
        phone: mitras.phone,
      })
      .from(mitras)
      .where(eq(mitras.id, mitraId))
      .limit(1);

    if (!mitra) {
      return null;
    }

    return {
      id: mitra.id,
      businessName: mitra.businessName,
      address: mitra.address,
      phone: mitra.phone,
    };
  }

  async updateProfile(
    mitraId: string,
    data: UpdateMitraProfileData
  ): Promise<MitraProfileDTO | null> {
    const updateData: Partial<typeof mitras.$inferInsert> = {
      businessName: data.businessName,
    };

    if (data.address !== undefined) {
      updateData.address = data.address;
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }

    await this.db.update(mitras).set(updateData).where(eq(mitras.id, mitraId));

    return this.getProfile(mitraId);
  }
}
