import { mitras } from "@treksistem/db";
import type { DbClient } from "@treksistem/db";
import { eq } from "drizzle-orm";

import { AuditService } from "./audit.service";

export interface MitraProfileDTO {
  id: string;
  businessName: string;
  address: string | null;
  phone: string | null;
  hasCompletedOnboarding: boolean;
}

export interface UpdateMitraProfileData {
  businessName: string;
  address?: string;
  phone?: string;
}

export class MitraProfileService {
  constructor(
    private db: DbClient,
    private auditService?: AuditService
  ) {}

  async getProfile(mitraId: string): Promise<MitraProfileDTO | null> {
    const [mitra] = await this.db
      .select({
        id: mitras.id,
        businessName: mitras.businessName,
        address: mitras.address,
        phone: mitras.phone,
        hasCompletedOnboarding: mitras.hasCompletedOnboarding,
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
      hasCompletedOnboarding: mitra.hasCompletedOnboarding,
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

    // Audit log the profile update
    if (this.auditService) {
      await this.auditService.log({
        actorId: mitraId,
        mitraId,
        entityType: "MITRA",
        entityId: mitraId,
        eventType: "MITRA_PROFILE_UPDATED",
        details: {
          action: "PROFILE_UPDATED",
          changes: data,
        },
      });
    }

    return this.getProfile(mitraId);
  }

  async completeOnboarding(mitraId: string): Promise<MitraProfileDTO | null> {
    await this.db
      .update(mitras)
      .set({ hasCompletedOnboarding: true })
      .where(eq(mitras.id, mitraId));

    // Audit log the onboarding completion
    if (this.auditService) {
      await this.auditService.log({
        actorId: mitraId,
        mitraId,
        entityType: "MITRA",
        entityId: mitraId,
        eventType: "MITRA_ONBOARDING_COMPLETED",
        details: {
          action: "ONBOARDING_COMPLETED",
        },
      });
    }

    return this.getProfile(mitraId);
  }
}
