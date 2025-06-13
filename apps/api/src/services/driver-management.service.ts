import type { DbClient } from "@treksistem/db";
import {
  driverInvites,
  drivers,
  users,
  mitras,
} from "@treksistem/db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface DriverResponse {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export class DriverManagementService {
  constructor(private db: DbClient) {}
  async inviteDriver(mitraId: string, email: string): Promise<{ inviteLink: string }> {
    // Check subscription status first
    const mitra = await this.db
      .select()
      .from(mitras)
      .where(eq(mitras.id, mitraId))
      .get();

    if (!mitra) {
      throw new Error("Mitra not found");
    }

    // Enforce subscription status before allowing driver invitations
    if (mitra.subscriptionStatus === 'past_due' || mitra.subscriptionStatus === 'cancelled') {
      const error = new Error("Your subscription is not active. Please pay your outstanding invoices to continue adding drivers.");
      (error as any).code = "PAYMENT_REQUIRED";
      throw error;
    }

    const currentDriverCount = await this.db
      .select({ count: drivers.id })
      .from(drivers)
      .where(eq(drivers.mitraId, mitraId));

    if (currentDriverCount.length >= mitra.activeDriverLimit) {
      const error = new Error("Driver limit reached. Please upgrade your subscription to add more drivers.");
      (error as any).code = "PAYMENT_REQUIRED";
      throw error;
    }

    const existingDriver = await this.db
      .select()
      .from(drivers)
      .innerJoin(users, eq(drivers.userId, users.id))
      .where(and(eq(drivers.mitraId, mitraId), eq(users.email, email)))
      .get();

    if (existingDriver) {
      throw new Error("Driver already exists for this Mitra");
    }

    const existingInvite = await this.db
      .select()
      .from(driverInvites)
      .where(and(
        eq(driverInvites.mitraId, mitraId),
        eq(driverInvites.email, email),
        eq(driverInvites.status, "pending")
      ))
      .get();

    if (existingInvite) {
      throw new Error("Pending invitation already exists for this email");
    }

    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.db.insert(driverInvites).values({
      mitraId,
      email,
      token,
      expiresAt,
      status: "pending",
    });

    return {
      inviteLink: `https://treksistem.app/join?token=${token}`,
    };
  }

  async verifyInvite(token: string): Promise<{ token: string; mitraName: string }> {
    const invite = await this.db
      .select()
      .from(driverInvites)
      .innerJoin(mitras, eq(driverInvites.mitraId, mitras.id))
      .where(eq(driverInvites.token, token))
      .get();

    if (!invite) {
      throw new Error("Invitation not found");
    }

    if (invite.driver_invites.status !== "pending") {
      throw new Error("Invitation has already been used");
    }

    if (new Date() > invite.driver_invites.expiresAt) {
      throw new Error("Invitation has expired");
    }

    return {
      token: invite.driver_invites.token,
      mitraName: invite.mitras.businessName,
    };
  }

  async acceptInvite(userId: string, token: string): Promise<{ mitraName: string }> {
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      throw new Error("User not found");
    }

    const invite = await this.db
      .select()
      .from(driverInvites)
      .innerJoin(mitras, eq(driverInvites.mitraId, mitras.id))
      .where(eq(driverInvites.token, token))
      .get();

    if (!invite) {
      throw new Error("Invalid invitation token");
    }

    if (invite.driver_invites.status !== "pending") {
      throw new Error("Invitation has already been used");
    }

    if (new Date() > invite.driver_invites.expiresAt) {
      throw new Error("Invitation has expired");
    }

    if (invite.driver_invites.email !== user.email) {
      throw new Error("Invitation email does not match logged-in user");
    }

    const existingDriver = await this.db
      .select()
      .from(drivers)
      .where(and(
        eq(drivers.userId, userId),
        eq(drivers.mitraId, invite.driver_invites.mitraId)
      ))
      .get();

    if (existingDriver) {
      throw new Error("User is already a driver for this Mitra");
    }

    await this.db.insert(drivers).values({
      userId,
      mitraId: invite.driver_invites.mitraId,
      status: "active",
    });

    await this.db
      .update(driverInvites)
      .set({ status: "accepted" })
      .where(eq(driverInvites.id, invite.driver_invites.id));

    return {
      mitraName: invite.mitras.businessName,
    };
  }

  async listDriversForMitra(mitraId: string): Promise<DriverResponse[]> {
    const driversList = await this.db
      .select({
        id: drivers.id,
        userId: drivers.userId,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(drivers)
      .innerJoin(users, eq(drivers.userId, users.id))
      .where(eq(drivers.mitraId, mitraId));

    return driversList;
  }

  async removeDriver(mitraId: string, driverId: string): Promise<void> {
    const driver = await this.db
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, driverId), eq(drivers.mitraId, mitraId)))
      .get();

    if (!driver) {
      throw new Error("Driver not found or does not belong to this Mitra");
    }

    await this.db.delete(drivers).where(eq(drivers.id, driverId));
  }

  async resendInvite(mitraId: string, inviteId: string): Promise<void> {
    const invite = await this.db
      .select()
      .from(driverInvites)
      .where(and(eq(driverInvites.id, inviteId), eq(driverInvites.mitraId, mitraId)))
      .get();

    if (!invite) {
      throw new Error("Invitation not found");
    }

    if (invite.status === "accepted") {
      throw new Error("Cannot resend an invitation that has already been accepted");
    }

    // Update the expiry date to extend the invitation
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    await this.db
      .update(driverInvites)
      .set({ expiresAt: newExpiresAt })
      .where(eq(driverInvites.id, inviteId));

    // In a real implementation, you would also send the email here
    // For now, we just update the database to extend the invitation
  }
}