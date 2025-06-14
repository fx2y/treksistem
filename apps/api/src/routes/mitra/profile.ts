import { zValidator } from "@hono/zod-validator";
import type { createAuthServices } from "@treksistem/auth";
import type { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { z } from "zod";

import { MitraProfileService } from "../../services/mitra-profile.service";

const UpdateMitraProfileSchema = z.object({
  businessName: z
    .string()
    .min(3, "Business name must be at least 3 characters"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

const profile = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
    db: ReturnType<typeof drizzle>;
    mitraId: string;
    userId: string;
  };
}>();

profile.get("/", async c => {
  try {
    const db = c.get("db");
    const mitraId = c.get("mitraId");

    const profileService = new MitraProfileService(db);
    const profileData = await profileService.getProfile(mitraId);

    if (!profileData) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json(profileData, 200);
  } catch (error) {
    console.error("Failed to get mitra profile:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profile.put("/", zValidator("json", UpdateMitraProfileSchema), async c => {
  try {
    const db = c.get("db");
    const mitraId = c.get("mitraId");
    const input = c.req.valid("json");

    const profileService = new MitraProfileService(db);
    const updatedProfile = await profileService.updateProfile(mitraId, input);

    if (!updatedProfile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json(updatedProfile, 200);
  } catch (error) {
    console.error("Failed to update mitra profile:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

profile.put("/complete-onboarding", async c => {
  try {
    const db = c.get("db");
    const mitraId = c.get("mitraId");

    const profileService = new MitraProfileService(db);
    const updatedProfile = await profileService.completeOnboarding(mitraId);

    if (!updatedProfile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json(updatedProfile, 200);
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default profile;
