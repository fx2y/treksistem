import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthService } from "./auth.service";

// Mock dependencies
const mockDb = {
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "session_123" }]),
    }),
  }),
  delete: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
  update: vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "user_123", name: "Updated User", email: "user@example.com" }]),
      }),
    }),
  }),
  query: {
    oauthSessions: {
      findFirst: vi.fn(),
    },
    users: {
      findFirst: vi.fn(),
    },
    refreshTokens: {
      findMany: vi.fn(),
    },
  },
} as any;

const mockGoogleProvider = {
  createAuthorizationURL: vi.fn().mockReturnValue(new URL("https://accounts.google.com/oauth/authorize")),
  validateAuthorizationCode: vi.fn().mockResolvedValue({
    accessToken: "google_access_token",
    refreshToken: "google_refresh_token",
  }),
} as any;

const mockJwtService = {
  signAccessToken: vi.fn().mockResolvedValue("access_token_123"),
} as any;

const mockRefreshTokenService = {
  createRefreshToken: vi.fn().mockResolvedValue({
    token: "refresh_token_123",
    hashedToken: "hashed_refresh_token_123",
  }),
  verifyRefreshToken: vi.fn().mockResolvedValue(true),
} as any;

const mockAuditService = {
  log: vi.fn().mockResolvedValue(undefined),
} as any;

// Mock global fetch
global.fetch = vi.fn();

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService({
      db: mockDb,
      googleProvider: mockGoogleProvider,
      jwtService: mockJwtService,
      refreshTokenService: mockRefreshTokenService,
      frontendUrl: "http://localhost:3000",
      auditService: mockAuditService,
    });
  });

  describe("initiateGoogleLogin", () => {
    it("should create OAuth session and return redirect URL", async () => {
      const result = await authService.initiateGoogleLogin();

      expect(result).toEqual({
        redirectUrl: "https://accounts.google.com/oauth/authorize",
        sessionId: "session_123",
      });

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      expect(mockGoogleProvider.createAuthorizationURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleGoogleCallback", () => {
    beforeEach(() => {
      // Mock OAuth session lookup
      mockDb.query.oauthSessions.findFirst.mockResolvedValue({
        id: "session_123",
        state: "valid_state",
        codeVerifier: "code_verifier_123",
        expiresAt: new Date(Date.now() + 60000), // Future date
      });

      // Mock Google API response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: "google_123",
          email: "user@example.com",
          name: "Test User",
          picture: "https://example.com/avatar.jpg",
        }),
      });
    });

    it("should create new user and return tokens", async () => {
      // Mock user not found
      mockDb.query.users.findFirst.mockResolvedValue(null);
      
      // Mock user creation
      mockDb.insert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: "user_123",
            googleId: "google_123",
            email: "user@example.com",
            name: "Test User",
          }]),
        }),
      });

      const result = await authService.handleGoogleCallback("auth_code", "valid_state");

      expect(result).toEqual({
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
        expiresIn: 900,
      });

      expect(mockJwtService.signAccessToken).toHaveBeenCalledWith({
        userId: "user_123",
      });
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: "user_123",
        entityType: "USER",
        entityId: "user_123",
        eventType: "USER_LOGIN",
        details: {
          email: "user@example.com",
          name: "Test User",
          loginMethod: "google_oauth",
        },
      });
    });

    it("should update existing user and return tokens", async () => {
      // Mock existing user found
      mockDb.query.users.findFirst.mockResolvedValue({
        id: "user_123",
        googleId: "google_123",
        email: "old@example.com",
        name: "Old Name",
      });

      const result = await authService.handleGoogleCallback("auth_code", "valid_state");

      expect(result).toEqual({
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
        expiresIn: 900,
      });

      expect(mockDb.update).toHaveBeenCalledTimes(1);
    });

    it("should throw error for invalid state", async () => {
      mockDb.query.oauthSessions.findFirst.mockResolvedValue(null);

      await expect(
        authService.handleGoogleCallback("auth_code", "invalid_state")
      ).rejects.toThrow("Invalid OAuth state");
    });

    it("should throw error for expired session", async () => {
      mockDb.query.oauthSessions.findFirst.mockResolvedValue({
        id: "session_123",
        state: "valid_state",
        codeVerifier: "code_verifier_123",
        expiresAt: new Date(Date.now() - 60000), // Past date
      });

      await expect(
        authService.handleGoogleCallback("auth_code", "valid_state")
      ).rejects.toThrow("OAuth session expired");
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh tokens successfully", async () => {
      mockDb.query.refreshTokens.findMany.mockResolvedValue([
        {
          id: "token_123",
          hashedToken: "hashed_token_123",
          expiresAt: new Date(Date.now() + 60000),
          user: {
            id: "user_123",
            email: "user@example.com",
          },
        },
      ]);

      const result = await authService.refreshAccessToken("refresh_token_123");

      expect(result).toEqual({
        accessToken: "access_token_123",
        refreshToken: "refresh_token_123",
        expiresIn: 900,
      });

      expect(mockRefreshTokenService.verifyRefreshToken).toHaveBeenCalledWith(
        "refresh_token_123",
        "hashed_token_123"
      );
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it("should throw error for invalid refresh token", async () => {
      mockDb.query.refreshTokens.findMany.mockResolvedValue([]);

      await expect(
        authService.refreshAccessToken("invalid_token")
      ).rejects.toThrow("Invalid refresh token");
    });
  });

  describe("logout", () => {
    it("should logout successfully with userId", async () => {
      const result = await authService.logout("refresh_token_123", "user_123");

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: "user_123",
        entityType: "USER",
        entityId: "user_123",
        eventType: "USER_LOGOUT",
        details: {
          logoutMethod: "manual",
        },
      });
    });

    it("should logout successfully without userId", async () => {
      mockDb.query.refreshTokens.findMany.mockResolvedValue([
        {
          id: "token_123",
          userId: "user_123",
          hashedToken: "hashed_token_123",
        },
      ]);

      const result = await authService.logout("refresh_token_123");

      expect(result).toEqual({ success: true });
      expect(mockRefreshTokenService.verifyRefreshToken).toHaveBeenCalledWith(
        "refresh_token_123",
        "hashed_token_123"
      );
    });
  });

  describe("cleanupExpiredSessions", () => {
    it("should clean up expired sessions and tokens", async () => {
      await authService.cleanupExpiredSessions();

      expect(mockDb.delete).toHaveBeenCalledTimes(2);
    });
  });
});