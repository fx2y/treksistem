import type { createAuthServices } from "@treksistem/auth";
import { Hono } from "hono";

import type { ServiceContainer } from "../services/factory";

import billing from "./mitra/billing";
import drivers from "./mitra/drivers";
import invites from "./mitra/invites";
import { logbookRoutes } from "./mitra/logbook";
import masterData from "./mitra/master-data";
import orders from "./mitra/orders";
import profile from "./mitra/profile";
import services from "./mitra/services";
import vehicles from "./mitra/vehicles";

const mitra = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
    services: ServiceContainer;
    mitraId: string;
  };
}>();

// Middleware to require auth and Mitra role
mitra.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAuth(c, next);
});
mitra.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireMitraRole(c, next);
});

// Mount service routes
mitra.route("/billing", billing);
mitra.route("/drivers", drivers);
mitra.route("/invites", invites);
mitra.route("/logbook", logbookRoutes);
mitra.route("/orders", orders);
mitra.route("/profile", profile);
mitra.route("/services", services);
mitra.route("/vehicles", vehicles);
mitra.route("/master-data", masterData);

export default mitra;
