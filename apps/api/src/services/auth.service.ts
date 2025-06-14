import type { DbClient } from "@treksistem/db";
import type { Google } from "arctic";
import { generateState, generateCodeVerifier } from "arctic";
import type { JwtService, RefreshTokenService } from "@treksistem/auth";

import { BadRequestError } from "../lib/errors";

export interface AuthServiceDependencies {
  db: DbClient;
  googleProvider: Google;
  jwtService: JwtService;
  refreshTokenService: RefreshTokenService;
  frontendUrl: string;
}

export interface LoginResponse {
  redirectUrl: string;
  state: string;
  codeVerifier: string;
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

    return {
      redirectUrl: redirectUrl.toString(),
      state,
      codeVerifier,
    };
  }

  async handleGoogleCallback(
    code: string,
    state: string,
    storedState: string,
    codeVerifier: string
  ): Promise<TokenResponse> {
    if (state !== storedState) {
      throw new BadRequestError("Invalid state parameter", "INVALID_STATE");
    }

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

      const googleUser = await response.json() as { id: string; email: string; name: string };

      // TODO: Create or update user in database
      // This would require the users table and proper user management
      const userId = googleUser.id; // Temporary - should be our internal user ID

      const accessToken = await this.deps.jwtService.signAccessToken({
        userId,
      });
      const { token: refreshToken } = await this.deps.refreshTokenService.createRefreshToken(
        userId
      );

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
    // TODO: Implement proper refresh token validation against database
    // For now, generate new tokens
    const userId = crypto.randomUUID(); // Should come from stored refresh token

    const newAccessToken = await this.deps.jwtService.signAccessToken({
      userId,
    });
    const { token: newRefreshToken } = await this.deps.refreshTokenService.createRefreshToken(
      userId
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  async logout(_refreshToken?: string): Promise<LogoutResponse> {
    // TODO: Invalidate refresh token in database if provided
    if (_refreshToken) {
      // Would normally remove from database
      console.log("Invalidating refresh token:", _refreshToken);
    }

    return {
      success: true,
    };
  }
}