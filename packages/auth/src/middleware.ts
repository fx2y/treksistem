import type { User } from "@treksistem/db";
import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

import type { JwtPayload, AuthenticatedUserProfile } from "./types";

import type { JwtService } from "./index";

declare module "hono" {
  interface ContextVariableMap {
    jwtPayload: JwtPayload;
    user: User;
    userId: string;
    mitraId: string;
    driverId: string;
  }
}

export function createAuthMiddleware(jwtService: JwtService, db: any) {
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

    // Fetch user details and set in context
    const user = await db.query.users.findFirst({
      where: (users: any, { eq }: any) => eq(users.id, payload.userId),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    c.set("jwtPayload", payload);
    c.set("user", user);
    c.set("userId", user.id);
    await next();
  }

  async function requireMitraRole(c: Context, next: Next) {
    const payload = c.get("jwtPayload");
    if (!payload) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const mitra = await db.query.mitras.findFirst({
      where: (mitras: any, { eq }: any) => eq(mitras.userId, payload.userId),
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
      where: (drivers: any, { eq }: any) => eq(drivers.userId, payload.userId),
    });

    if (!driver) {
      return c.json({ error: "Forbidden - Driver role required" }, 403);
    }

    c.set("driverId", driver.id.toString());
    await next();
  }

  async function requireAdminRole(c: Context, next: Next) {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (user.role !== "admin") {
      return c.json({ error: "Forbidden - Admin role required" }, 403);
    }

    await next();
  }

  function requirePermission(permission: string) {
    return async (c: Context, next: Next) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Check if user has permission based on role
      const hasPermission = await checkUserPermission(user, permission);
      if (!hasPermission) {
        return c.json({ 
          error: `Forbidden - Permission '${permission}' required` 
        }, 403);
      }

      await next();
    };
  }

  async function checkUserPermission(user: any, permission: string): Promise<boolean> {
    // Admin users have all permissions
    if (user.role === "admin") {
      return true;
    }

    // Permission matrix based on user roles and context
    const permissionChecks: Record<string, () => Promise<boolean>> = {
      // Mitra permissions
      "mitra:manage_drivers": async () => {
        const mitra = await db.query.mitras.findFirst({
          where: (mitras: any, { eq }: any) => eq(mitras.userId, user.id),
        });
        return !!mitra;
      },
      
      "mitra:manage_services": async () => {
        const mitra = await db.query.mitras.findFirst({
          where: (mitras: any, { eq }: any) => eq(mitras.userId, user.id),
        });
        return !!mitra;
      },
      
      "mitra:view_analytics": async () => {
        const mitra = await db.query.mitras.findFirst({
          where: (mitras: any, { eq }: any) => eq(mitras.userId, user.id),
        });
        return !!mitra;
      },

      // Driver permissions
      "driver:manage_orders": async () => {
        const driver = await db.query.drivers.findFirst({
          where: (drivers: any, { eq }: any) => eq(drivers.userId, user.id),
        });
        return !!driver;
      },
      
      "driver:update_location": async () => {
        const driver = await db.query.drivers.findFirst({
          where: (drivers: any, { eq }: any) => eq(drivers.userId, user.id),
        });
        return !!driver;
      },

      // Admin permissions
      "admin:impersonate": () => Promise.resolve(user.role === "admin"),
      "admin:system_settings": () => Promise.resolve(user.role === "admin"),
      "admin:user_management": () => Promise.resolve(user.role === "admin"),
    };

    const check = permissionChecks[permission];
    return check ? await check() : false;
  }

  async function getUserProfile(
    c: Context
  ): Promise<AuthenticatedUserProfile | null> {
    const payload = c.get("jwtPayload");
    if (!payload) {
      return null;
    }

    const user = await db.query.users.findFirst({
      where: (users: any, { eq }: any) => eq(users.id, payload.userId),
    });

    if (!user) {
      return null;
    }

    // Check Mitra role
    const mitra = await db.query.mitras.findFirst({
      where: (mitras: any, { eq }: any) => eq(mitras.userId, user.id),
    });

    // Check Driver role and associated Mitras
    const drivers = await db.query.drivers.findMany({
      where: (drivers: any, { eq }: any) => eq(drivers.userId, user.id),
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
        driverForMitras: drivers.map((d: any) => ({
          mitraId: d.mitra.id.toString(),
          businessName: d.mitra.businessName,
        })),
        isAdmin: user.role === "admin",
      },
      mitra: mitra
        ? {
            id: mitra.id,
            businessName: mitra.businessName,
            hasCompletedOnboarding: mitra.hasCompletedOnboarding,
            activeDriverLimit: mitra.activeDriverLimit,
          }
        : undefined,
    };
  }

  return {
    requireAuth,
    requireMitraRole,
    requireDriverRole,
    requireAdminRole,
    requirePermission,
    checkUserPermission,
    getUserProfile,
  };
}
