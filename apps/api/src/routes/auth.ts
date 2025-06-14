import { createAuthServices, type AuthEnvironment } from "@treksistem/auth";
import { type User, type NewUser, users, refreshTokens } from "@treksistem/db";
import { generateState, generateCodeVerifier } from "arctic";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";

import { rateLimit } from "../middleware/rate-limiter";
import type { ServiceContainer } from "../services/factory";

// Utility function to generate PKCE code challenge
async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const base64String = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

const auth = new Hono<{
  Bindings: AuthEnvironment;
  Variables: {
    services: ServiceContainer;
  };
}>();

// Rate limiting for auth endpoints - 10 requests per 60 seconds
const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 60 seconds
  max: 10, // 10 requests per window
});

// Apply rate limiting to all auth endpoints
auth.use("*", authRateLimit);

auth.get("/login/google", async c => {
  const { googleProvider } = createAuthServices(c.env);

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const url = await googleProvider.createAuthorizationURL(
    state,
    codeChallenge,
    {
      scopes: ["profile", "email"],
    }
  );

  // Store state and code verifier in secure cookies
  setCookie(c, "google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  setCookie(c, "google_oauth_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return c.redirect(url.toString());
});

auth.get("/callback/google", async c => {
  const { googleProvider, jwtService, refreshTokenService } =
    createAuthServices(c.env);

  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "google_oauth_state");
  const codeVerifier = getCookie(c, "google_oauth_code_verifier");

  if (
    !code ||
    !state ||
    !storedState ||
    !codeVerifier ||
    state !== storedState
  ) {
    return c.json({ error: "Invalid OAuth callback" }, 400);
  }

  try {
    const tokens = await googleProvider.validateAuthorizationCode(
      code,
      codeVerifier
    );

    // Fetch user info from Google
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    if (!userResponse.ok) {
      return c.json({ error: "Failed to fetch user info" }, 500);
    }

    const googleUser = (await userResponse.json()) as {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    const { db } = c.get("services");

    // JIT user provisioning within transaction
    const user = await db.transaction(async tx => {
      let existingUser = await tx.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, googleUser.email),
      });

      if (!existingUser) {
        const newUser: NewUser = {
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture || null,
          googleId: googleUser.id,
          role: "user",
        };

        await tx.insert(users).values(newUser);
        existingUser = newUser as User;
      }

      return existingUser;
    });

    // Create access token (15 minutes)
    const accessToken = await jwtService.signAccessToken({ userId: user.id });

    // Create refresh token (30 days)
    const { token: refreshToken, hashedToken } =
      await refreshTokenService.createRefreshToken(user.id);

    // Store refresh token in database
    await db.insert(refreshTokens).values({
      userId: user.id,
      hashedToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Set secure cookies
    setCookie(c, "access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 60 * 15, // 15 minutes
      path: "/",
    });

    setCookie(c, "refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    // Clear OAuth cookies
    setCookie(c, "google_oauth_state", "", { maxAge: 0 });
    setCookie(c, "google_oauth_code_verifier", "", { maxAge: 0 });

    // Log successful login
    const { auditService } = c.get("services");
    await auditService.log({
      actorId: user.id,
      entityType: "USER",
      entityId: user.id,
      eventType: "USER_LOGIN",
      details: { method: "google_oauth" },
    });

    return c.redirect(c.env.FRONTEND_URL || "/dashboard");
  } catch (error) {
    console.error("OAuth callback error:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
});

auth.use("/me", async (c, next) => {
  const { authMiddleware } = createAuthServices(c.env);
  return authMiddleware.requireAuth(c, next);
});

auth.get("/me", async c => {
  const { authMiddleware } = createAuthServices(c.env);

  // Apply auth middleware
  try {
    await authMiddleware.requireAuth(c, () => Promise.resolve());
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await authMiddleware.getUserProfile(c);
  if (!profile) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json(profile);
});

auth.post("/logout", async c => {
  const { db, auditService } = c.get("services");
  const refreshToken = getCookie(c, "refresh_token");

  if (refreshToken) {
    // Find and delete refresh token from database
    const existingToken = await db.query.refreshTokens.findFirst({
      where: (tokens, { eq }) => eq(tokens.hashedToken, refreshToken),
    });

    if (existingToken) {
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.id, existingToken.id));

      // Log logout event
      await auditService.log({
        actorId: existingToken.userId,
        entityType: "USER",
        entityId: existingToken.userId,
        eventType: "USER_LOGOUT",
        details: { method: "manual" },
      });
    }
  }

  // Clear all auth cookies
  setCookie(c, "access_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    maxAge: 0,
    path: "/",
  });

  setCookie(c, "refresh_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    maxAge: 0,
    path: "/",
  });

  return c.json({ success: true });
});

auth.post("/refresh", async c => {
  const { jwtService, refreshTokenService } = createAuthServices(c.env);
  const { db } = c.get("services");
  const refreshToken = getCookie(c, "refresh_token");

  if (!refreshToken) {
    return c.json({ error: "No refresh token provided" }, 401);
  }

  try {
    // Find refresh token in database
    const storedToken = await db.query.refreshTokens.findFirst({
      where: (tokens: any, { eq }: any) => eq(tokens.hashedToken, refreshToken),
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return c.json({ error: "Invalid or expired refresh token" }, 401);
    }

    // Verify the refresh token
    const isValid = await refreshTokenService.verifyRefreshToken(
      refreshToken,
      storedToken.hashedToken
    );
    if (!isValid) {
      return c.json({ error: "Invalid refresh token" }, 401);
    }

    // Create new access token
    const newAccessToken = await jwtService.signAccessToken({
      userId: storedToken.userId,
    });

    // Set new access token cookie
    setCookie(c, "access_token", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 60 * 15, // 15 minutes
      path: "/",
    });

    // Log token refresh
    const { auditService } = c.get("services");
    await auditService.log({
      actorId: storedToken.userId,
      entityType: "USER",
      entityId: storedToken.userId,
      eventType: "USER_LOGIN",
      details: { method: "refresh_token" },
    });

    return c.json({ status: "ok" });
  } catch (error) {
    console.error("Token refresh error:", error);
    return c.json({ error: "Token refresh failed" }, 500);
  }
});

export default auth;
