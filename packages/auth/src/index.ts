import {
  createAuditService,
  type AuditLoggingService,
} from "@treksistem/audit";
import { Google } from "arctic";
import { drizzle } from "drizzle-orm/d1";
import { sign, verify } from "hono/jwt";
import { nanoid } from "nanoid";
import { Argon2id } from "oslo/password";

import { createAuthMiddleware } from "./middleware";
import type { JwtPayload } from "./types";

export interface AuthServices {
  googleProvider: Google;
  jwtService: JwtService;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  auditService: AuditLoggingService;
  refreshTokenService: RefreshTokenService;
}

export interface JwtService {
  signAccessToken: (payload: { userId: string }) => Promise<string>;
  signRefreshToken: () => string;
  verifyAccessToken: (token: string) => Promise<JwtPayload | null>;
}

export interface RefreshTokenService {
  createRefreshToken: (
    userId: string
  ) => Promise<{ token: string; hashedToken: string }>;
  verifyRefreshToken: (token: string, hashedToken: string) => Promise<boolean>;
  generateTokenHash: (token: string) => Promise<string>;
}

export interface AuthEnvironment {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  DB: D1Database;
}

// Factory function to create all auth services
export function createAuthServices(env: AuthEnvironment): AuthServices {
  const db = drizzle(env.DB, { schema: require("@treksistem/db") });

  const googleProvider = new Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `${env.FRONTEND_URL}/api/auth/callback/google`
  );

  const jwtService: JwtService = {
    signAccessToken: async (payload: { userId: string }): Promise<string> => {
      const now = Math.floor(Date.now() / 1000);
      const fullPayload: JwtPayload = {
        ...payload,
        iat: now,
        exp: now + 60 * 15, // 15 minutes
      };
      return sign(fullPayload, env.JWT_SECRET);
    },

    signRefreshToken: (): string => {
      return nanoid(32);
    },

    verifyAccessToken: async (token: string): Promise<JwtPayload | null> => {
      try {
        const payload = await verify(token, env.JWT_SECRET);
        return payload as JwtPayload;
      } catch {
        return null;
      }
    },
  };

  const refreshTokenService: RefreshTokenService = {
    createRefreshToken: async (_userId: string) => {
      const token = nanoid(32);
      const hashedToken = await new Argon2id().hash(token);
      return { token, hashedToken };
    },

    verifyRefreshToken: async (
      token: string,
      hashedToken: string
    ): Promise<boolean> => {
      try {
        return await new Argon2id().verify(hashedToken, token);
      } catch {
        return false;
      }
    },

    generateTokenHash: async (token: string): Promise<string> => {
      return new Argon2id().hash(token);
    },
  };

  const authMiddleware = createAuthMiddleware(jwtService, db);
  const auditService = createAuditService(db);

  return {
    googleProvider,
    jwtService,
    authMiddleware,
    auditService,
    refreshTokenService,
  };
}

// Legacy exports for backward compatibility
export function createGoogleProvider(
  clientId: string,
  clientSecret: string,
  redirectUri?: string
) {
  return new Google(
    clientId,
    clientSecret,
    redirectUri || "http://localhost:8787/api/auth/callback/google"
  );
}

export async function signJwt(
  payload: { userId: string },
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // 7 days
  };
  return sign(fullPayload, secret);
}

export async function verifyJwt(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  try {
    const payload = await verify(token, secret);
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

// Re-exports
export * from "./middleware";
export * from "./types";
