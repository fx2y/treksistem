import type { DbClient } from "@treksistem/db";
import { users, refreshTokens, oauthSessions } from "@treksistem/db";
import { eq, gt, lt } from "drizzle-orm";
import type { Google } from "arctic";
import { generateState, generateCodeVerifier } from "arctic";
import type { JwtService, RefreshTokenService } from "@treksistem/auth";

import { BadRequestError } from "../lib/errors";
import { AuditService } from "./audit.service";

export interface AuthServiceDependencies {
  db: DbClient;
  googleProvider: Google;
  jwtService: JwtService;
  refreshTokenService: RefreshTokenService;
  frontendUrl: string;
  auditService?: AuditService;
}

export interface LoginResponse {
  redirectUrl: string;
  sessionId: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LogoutResponse {
  success: boolean;
}

export class AuthService {
  constructor(private deps: AuthServiceDependencies) {}

  async initiateGoogleLogin(): Promise<LoginResponse> {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const redirectUrl = this.deps.googleProvider.createAuthorizationURL(
      state,
      codeVerifier,
      {
        scopes: ["openid", "profile", "email"]
      }
    );

    // Store OAuth session in database
    const session = await this.deps.db
      .insert(oauthSessions)
      .values({
        state,
        codeVerifier,
        provider: "google",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      })
      .returning()
      .then(rows => rows[0]);

    return {
      redirectUrl: redirectUrl.toString(),
      sessionId: session.id,
    };
  }

  async handleGoogleCallback(
    code: string,
    state: string
  ): Promise<TokenResponse> {
    // Find OAuth session by state
    const session = await this.deps.db.query.oauthSessions.findFirst({
      where: eq(oauthSessions.state, state),
    });

    if (!session) {
      throw new BadRequestError("Invalid OAuth state", "INVALID_STATE");
    }

    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await this.deps.db.delete(oauthSessions).where(eq(oauthSessions.id, session.id));
      throw new BadRequestError("OAuth session expired", "SESSION_EXPIRED");
    }

    const codeVerifier = session.codeVerifier;

    try {
      const tokens = await this.deps.googleProvider.validateAuthorizationCode(
        code,
        codeVerifier
      );

      // Get user info from Google
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new BadRequestError(
          "Failed to fetch user info",
          "GOOGLE_API_ERROR"
        );
      }

      const googleUser = await response.json() as { id: string; email: string; name: string; picture?: string };

      // Create or update user in database
      let user = await this.deps.db.query.users.findFirst({
        where: eq(users.googleId, googleUser.id),
      });

      if (!user) {
        // Create new user
        const newUser = await this.deps.db
          .insert(users)
          .values({
            googleId: googleUser.id,
            email: googleUser.email,
            name: googleUser.name,
            avatarUrl: googleUser.picture,
          })
          .returning()
          .then(rows => rows[0]);
        
        user = newUser;
      } else {
        // Update existing user info
        user = await this.deps.db
          .update(users)
          .set({
            email: googleUser.email,
            name: googleUser.name,
            avatarUrl: googleUser.picture,
          })
          .where(eq(users.id, user.id))
          .returning()
          .then(rows => rows[0]);
      }

      if (!user) {
        throw new BadRequestError("Failed to create or update user", "USER_CREATION_FAILED");
      }

      const accessToken = await this.deps.jwtService.signAccessToken({
        userId: user.id,
      });
      
      // Create refresh token and store in database
      const { token: refreshToken, hashedToken } = await this.deps.refreshTokenService.createRefreshToken(
        user.id
      );
      
      await this.deps.db.insert(refreshTokens).values({
        userId: user.id,
        hashedToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      // Clean up OAuth session after successful login
      await this.deps.db.delete(oauthSessions).where(eq(oauthSessions.id, session.id));

      // Audit log the login
      if (this.deps.auditService) {
        await this.deps.auditService.log({
          actorId: user.id,
          entityType: "USER",
          entityId: user.id,
          eventType: "USER_LOGIN",
          details: {
            email: googleUser.email,
            name: googleUser.name,
            loginMethod: "google_oauth",
          },
        });
      }

      return {
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Bad verification code")) {
        throw new BadRequestError("Invalid authorization code", "INVALID_CODE");
      }
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    // Find non-expired refresh tokens in database
    const storedTokens = await this.deps.db.query.refreshTokens.findMany({
      where: gt(refreshTokens.expiresAt, new Date()),
      with: {
        user: true,
      },
    });

    // Find matching token by verifying hash
    let validToken = null;
    let matchedUser = null;
    
    for (const token of storedTokens) {
      const isValid = await this.deps.refreshTokenService.verifyRefreshToken(
        refreshToken,
        token.hashedToken
      );
      
      if (isValid && token.expiresAt > new Date()) {
        validToken = token;
        matchedUser = token.user;
        break;
      }
    }

    if (!validToken || !matchedUser) {
      throw new BadRequestError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    // Delete the old refresh token
    await this.deps.db.delete(refreshTokens).where(eq(refreshTokens.id, validToken.id));

    // Create new tokens
    const newAccessToken = await this.deps.jwtService.signAccessToken({
      userId: matchedUser.id,
    });
    
    const { token: newRefreshToken, hashedToken } = await this.deps.refreshTokenService.createRefreshToken(
      matchedUser.id
    );
    
    // Store new refresh token
    await this.deps.db.insert(refreshTokens).values({
      userId: matchedUser.id,
      hashedToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Audit log the token refresh
    if (this.deps.auditService) {
      await this.deps.auditService.log({
        actorId: matchedUser.id,
        entityType: "USER",
        entityId: matchedUser.id,
        eventType: "TOKEN_REFRESH",
        details: {
          refreshedAt: new Date().toISOString(),
        },
      });
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  async logout(refreshToken?: string, userId?: string): Promise<LogoutResponse> {
    // Invalidate refresh token in database if provided
    if (refreshToken) {
      try {
        // Find and delete refresh tokens for this user
        if (userId) {
          // Delete all refresh tokens for the user (logout from all devices)
          await this.deps.db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
        } else {
          // Try to find and delete the specific refresh token
          const storedTokens = await this.deps.db.query.refreshTokens.findMany();
          
          for (const token of storedTokens) {
            const isValid = await this.deps.refreshTokenService.verifyRefreshToken(
              refreshToken,
              token.hashedToken
            );
            
            if (isValid) {
              await this.deps.db.delete(refreshTokens).where(eq(refreshTokens.id, token.id));
              userId = token.userId; // Set userId for audit log
              break;
            }
          }
        }
      } catch (error) {
        // Don't fail logout if token deletion fails
        console.error("Failed to invalidate refresh token:", error);
      }
    }

    // Audit log the logout
    if (this.deps.auditService && userId) {
      await this.deps.auditService.log({
        actorId: userId,
        entityType: "USER",
        entityId: userId,
        eventType: "USER_LOGOUT",
        details: {
          logoutMethod: "manual",
        },
      });
    }

    return {
      success: true,
    };
  }

  async cleanupExpiredSessions(): Promise<void> {
    // Clean up expired OAuth sessions
    await this.deps.db.delete(oauthSessions).where(lt(oauthSessions.expiresAt, new Date()));
    
    // Clean up expired refresh tokens
    await this.deps.db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, new Date()));
  }
}