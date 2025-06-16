#!/usr/bin/env node

/**
 * JWT Generation Utility for Showcase
 *
 * Generates valid, long-lived JWTs for each showcase persona.
 * Reads user IDs from the database and creates tokens using the JWT_SECRET.
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../packages/db/src/schema.ts";
import { eq } from "drizzle-orm";
import { sign } from "hono/jwt";
import fs from "fs";

const DATABASE_URL =
  "./.wrangler/state/v3/d1/miniflare-D1DatabaseObject/fc8ace76-5e4f-4bbe-8186-7d4198559f4d.sqlite";

class ShowcaseTokenGenerator {
  constructor() {
    this.client = new Database(DATABASE_URL);
    this.db = drizzle(this.client, { schema });
    this.jwtSecret = null;
    this.tokens = {};
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  loadJwtSecret() {
    try {
      // Try to read JWT_SECRET from .dev.vars
      const devVars = fs.readFileSync(".dev.vars", "utf8");
      const lines = devVars.split("\n");

      for (const line of lines) {
        if (line.startsWith("JWT_SECRET=")) {
          this.jwtSecret = line
            .substring("JWT_SECRET=".length)
            .replace(/['"]/g, "");
          this.log("✅ JWT_SECRET loaded from .dev.vars");
          return;
        }
      }

      throw new Error("JWT_SECRET not found in .dev.vars");
    } catch (error) {
      this.log("⚠️  Could not read .dev.vars, using fallback JWT_SECRET");
      this.jwtSecret = "showcase-jwt-secret-32-characters-long-string-for-demo";
    }
  }

  async getShowcasePersonas() {
    this.log("👥 Reading showcase personas from database...");

    const personas = {};

    // Get Master Admin
    const admin = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "admin@treksistem.com"))
      .get();

    if (admin) {
      personas.admin = admin;
    }

    // Get Mitra Bu Ani
    const buAni = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "bu.ani@example.com"))
      .get();

    if (buAni) {
      personas.buAni = buAni;
    }

    // Get Driver Budi
    const budi = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "budi.driver@example.com"))
      .get();

    if (budi) {
      personas.budi = budi;
    }

    // Get Customer Andi
    const andi = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "andi.customer@example.com"))
      .get();

    if (andi) {
      personas.andi = andi;
    }

    this.log(`✅ Found ${Object.keys(personas).length} personas in database`);
    return personas;
  }

  async generateTokens(personas) {
    this.log("🔐 Generating JWT tokens...");

    for (const [role, user] of Object.entries(personas)) {
      const payload = {
        userId: user.id,
        role: user.role,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 * 7, // 7 days
      };

      const token = await sign(payload, this.jwtSecret);
      this.tokens[role] = token;

      this.log(`✅ Generated token for ${role} (${user.email})`);
    }
  }

  generateExportCommands() {
    this.log("📋 Generating export commands...");

    const commands = [
      "# Showcase JWT Tokens",
      "# Copy and paste these commands to set environment variables",
      "",
    ];

    for (const [role, token] of Object.entries(this.tokens)) {
      const envVarName = `TOKEN_${role.toUpperCase()}`;
      commands.push(`export ${envVarName}="${token}"`);
    }

    commands.push("");
    commands.push("# Usage examples:");
    commands.push(
      '# curl -H "Authorization: Bearer $TOKEN_ADMIN" http://localhost:8787/api/admin/...'
    );
    commands.push(
      '# curl -H "Authorization: Bearer $TOKEN_BU_ANI" http://localhost:8787/api/mitra/...'
    );
    commands.push(
      '# curl -H "Authorization: Bearer $TOKEN_BUDI" http://localhost:8787/api/driver/...'
    );
    commands.push(
      '# curl -H "Authorization: Bearer $TOKEN_ANDI" http://localhost:8787/api/public/...'
    );

    return commands.join("\n");
  }

  async run() {
    try {
      this.log("🚀 Starting JWT token generation...");

      this.loadJwtSecret();
      const personas = await this.getShowcasePersonas();

      if (Object.keys(personas).length === 0) {
        throw new Error(
          "No showcase personas found in database. Run 'pnpm run db:seed:showcase' first."
        );
      }

      await this.generateTokens(personas);

      const exportCommands = this.generateExportCommands();

      console.log("\n" + "=".repeat(80));
      console.log(exportCommands);
      console.log("=".repeat(80) + "\n");

      this.log("🎉 JWT tokens generated successfully!");
    } catch (error) {
      console.error("❌ Token generation failed:", error);
      throw error;
    } finally {
      this.client.close();
    }
  }
}

// Run the token generator
const generator = new ShowcaseTokenGenerator();
generator.run().catch(process.exit);
