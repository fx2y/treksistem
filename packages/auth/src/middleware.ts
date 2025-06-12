import type { User } from "@treksistem/db";
import { drizzle } from "drizzle-orm/d1";
import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

import type { JwtPayload, AuthenticatedUserProfile } from "./types";

import type { JwtService } from "./index";

declare module "hono" {
  interface ContextVariableMap {
    jwtPayload: JwtPayload;
    user: User;
    mitraId: string;
    driverId: string;
  }
}

export function createAuthMiddleware(
  jwtService: JwtService,
  db: ReturnType<typeof drizzle>
) {
  async function requireAuth(c: Context, next: Next) {
    const token =
      getCookie(c, "access_token") ||
      c.req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const payload = await jwtService.verifyAccessToken(token);
    if (!payload) {
      return c.json({ error: "Invalid token" }, 401);
    }

    c.set("jwtPayload", payload);
    await next();
  }

  async function requireMitraRole(c: Context, next: Next) {
    const payload = c.get("jwtPayload");
    if (!payload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const mitra = await db.query.mitras.findFirst({
      where: (mitras, { eq }) => eq(mitras.userId, payload.userId),
    });

    if (!mitra) {
      return c.json({ error: "Forbidden - Mitra role required" }, 403);
    }

    c.set("mitraId", mitra.id.toString());
    await next();
  }

  async function requireDriverRole(c: Context, next: Next) {
    const payload = c.get("jwtPayload");
    if (!payload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const driver = await db.query.drivers.findFirst({
      where: (drivers, { eq }) => eq(drivers.userId, payload.userId),
    });

    if (!driver) {
      return c.json({ error: "Forbidden - Driver role required" }, 403);
    }

    c.set("driverId", driver.id.toString());
    await next();
  }

  async function requireAdminRole(c: Context, next: Next) {
    const payload = c.get("jwtPayload");
    if (!payload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, payload.userId),
    });

    if (!user?.isAdmin) {
      return c.json({ error: "Forbidden - Admin role required" }, 403);
    }

    await next();
  }

  async function getUserProfile(
    c: Context
  ): Promise<AuthenticatedUserProfile | null> {
    const payload = c.get("jwtPayload");
    if (!payload) {
      return null;
    }

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, payload.userId),
    });

    if (!user) {
      return null;
    }

    // Check Mitra role
    const mitra = await db.query.mitras.findFirst({
      where: (mitras, { eq }) => eq(mitras.userId, user.id),
    });

    // Check Driver role and associated Mitras
    const drivers = await db.query.drivers.findMany({
      where: (drivers, { eq }) => eq(drivers.userId, user.id),
      with: {
        mitra: true,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      roles: {
        isMitra: !!mitra,
        mitraId: mitra?.id.toString() || null,
        isDriver: drivers.length > 0,
        driverForMitras: drivers.map(d => ({
          mitraId: d.mitra.id.toString(),
          businessName: d.mitra.businessName,
        })),
        isAdmin: user.isAdmin,
      },
    };
  }

  return {
    requireAuth,
    requireMitraRole,
    requireDriverRole,
    requireAdminRole,
    getUserProfile,
  };
}
