import type { createAuthServices } from "@treksistem/auth";
import {
  masterVehicleTypes,
  masterPayloadTypes,
  masterFacilities,
  mitras,
  users,
  services,
  type NewService,
} from "@treksistem/db";
import { TemplateRepository, seedTemplates } from "@treksistem/notifications";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import type { ServiceContainer } from "../services/factory";

import billing from "./admin/billing";

const admin = new Hono<{
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
    jwtPayload: { userId: string };
  };
}>();

// Middleware to require auth and Admin role
admin.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAuth(c, next);
});
admin.use("*", async (c, next) => {
  const { authMiddleware } = c.get("authServices");
  return authMiddleware.requireAdminRole(c, next);
});

// Get all mitras
admin.get("/mitras", async c => {
  const { db } = c.get("services");

  const allMitras = await db
    .select({
      mitraId: mitras.id,
      businessName: mitras.businessName,
      ownerName: users.name,
      ownerEmail: users.email,
      subscriptionStatus: mitras.subscriptionStatus,
      createdAt: users.createdAt,
    })
    .from(mitras)
    .innerJoin(users, eq(mitras.userId, users.id));

  return c.json({ data: allMitras });
});

// Get master data by category
admin.get("/master-data/:category", async c => {
  const category = c.req.param("category");
  const { db } = c.get("services");

  let data;

  switch (category) {
    case "vehicle-types":
      data = await db.select().from(masterVehicleTypes);
      break;
    case "payload-types":
      data = await db.select().from(masterPayloadTypes);
      break;
    case "facilities":
      data = await db.select().from(masterFacilities);
      break;
    default:
      return c.json({ error: "Invalid category" }, 400);
  }

  return c.json({ data });
});

// Create master data item
admin.post("/master-data/:category", async c => {
  const category = c.req.param("category");
  const { name, icon } = await c.req.json();
  const { db } = c.get("services");
  const payload = c.get("jwtPayload");

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  let result;

  switch (category) {
    case "vehicle-types":
      result = await db
        .insert(masterVehicleTypes)
        .values({ name, icon })
        .returning();
      break;
    case "payload-types":
      result = await db
        .insert(masterPayloadTypes)
        .values({ name, icon })
        .returning();
      break;
    case "facilities":
      result = await db
        .insert(masterFacilities)
        .values({ name, icon })
        .returning();
      break;
    default:
      return c.json({ error: "Invalid category" }, 400);
  }

  const created = result[0];
  const { auditService } = c.get("services");
  await auditService.log({
    actorId: payload.userId,
    entityType: "MASTER_DATA",
    entityId: created.id,
    eventType: "MASTER_DATA_CREATED",
    details: {
      category,
      name,
      icon,
    },
  });

  return c.json(created, 201);
});

// Update master data item
admin.put("/master-data/:category/:itemId", async c => {
  const category = c.req.param("category");
  const itemId = c.req.param("itemId");
  const { name, icon } = await c.req.json();
  const { db } = c.get("services");
  const payload = c.get("jwtPayload");

  if (!name) {
    return c.json({ error: "Name is required" }, 400);
  }

  let result;

  switch (category) {
    case "vehicle-types":
      result = await db
        .update(masterVehicleTypes)
        .set({ name, icon })
        .where(eq(masterVehicleTypes.id, itemId))
        .returning();
      break;
    case "payload-types":
      result = await db
        .update(masterPayloadTypes)
        .set({ name, icon })
        .where(eq(masterPayloadTypes.id, itemId))
        .returning();
      break;
    case "facilities":
      result = await db
        .update(masterFacilities)
        .set({ name, icon })
        .where(eq(masterFacilities.id, itemId))
        .returning();
      break;
    default:
      return c.json({ error: "Invalid category" }, 400);
  }

  if (result.length === 0) {
    return c.json({ error: "Item not found" }, 404);
  }

  const { auditService } = c.get("services");
  await auditService.log({
    actorId: payload.userId,
    entityType: "MASTER_DATA",
    entityId: itemId,
    eventType: "MASTER_DATA_UPDATED",
    details: {
      category,
      name,
      icon,
    },
  });

  return c.json(result[0]);
});

// Delete master data item
admin.delete("/master-data/:category/:itemId", async c => {
  const category = c.req.param("category");
  const itemId = c.req.param("itemId");
  const { db } = c.get("services");
  const payload = c.get("jwtPayload");

  let result;

  switch (category) {
    case "vehicle-types":
      result = await db
        .delete(masterVehicleTypes)
        .where(eq(masterVehicleTypes.id, itemId))
        .returning();
      break;
    case "payload-types":
      result = await db
        .delete(masterPayloadTypes)
        .where(eq(masterPayloadTypes.id, itemId))
        .returning();
      break;
    case "facilities":
      result = await db
        .delete(masterFacilities)
        .where(eq(masterFacilities.id, itemId))
        .returning();
      break;
    default:
      return c.json({ error: "Invalid category" }, 400);
  }

  if (result.length === 0) {
    return c.json({ error: "Item not found" }, 404);
  }

  const { auditService } = c.get("services");
  await auditService.log({
    actorId: payload.userId,
    entityType: "MASTER_DATA",
    entityId: itemId,
    eventType: "MASTER_DATA_DELETED",
    details: {
      category,
      deletedItem: result[0],
    },
  });

  return c.body(null, 204);
});

// Create service on behalf of a mitra
admin.post("/mitras/:mitraId/services", async c => {
  const mitraId = c.req.param("mitraId");
  const serviceData = await c.req.json();
  const { db } = c.get("services");
  const payload = c.get("jwtPayload");

  // Verify mitra exists
  const mitra = await db
    .select()
    .from(mitras)
    .where(eq(mitras.id, mitraId))
    .limit(1);
  if (mitra.length === 0) {
    return c.json({ error: "Mitra not found" }, 404);
  }

  const newService: NewService = {
    mitraId,
    name: serviceData.name,
    isPublic: serviceData.isPublic || false,
    maxRangeKm: serviceData.maxRangeKm,
  };

  const result = await db.insert(services).values(newService).returning();
  const created = result[0];

  const { auditService } = c.get("services");
  await auditService.log({
    actorId: payload.userId,
    mitraId,
    entityType: "SERVICE",
    entityId: created.id,
    eventType: "SERVICE_CREATED",
    details: serviceData,
  });

  return c.json(created, 201);
});

// Invite driver on behalf of a mitra
admin.post("/mitras/:mitraId/drivers/invite", async c => {
  const mitraId = c.req.param("mitraId");
  const { email } = await c.req.json();
  const { db, driverManagementService } = c.get("services");

  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }

  // Verify mitra exists
  const mitra = await db
    .select()
    .from(mitras)
    .where(eq(mitras.id, mitraId))
    .limit(1);
  if (mitra.length === 0) {
    return c.json({ error: "Mitra not found" }, 404);
  }

  // Create driver invite using service
  const inviteResult = await driverManagementService.inviteDriver(
    mitraId,
    email
  );

  return c.json(inviteResult);
});

// Notification Template Management API
admin.get("/notifications/templates", async c => {
  const { db } = c.get("services");
  const templateRepo = new TemplateRepository(db);

  const templates = await templateRepo.findAll();
  return c.json(templates);
});

admin.post("/notifications/templates", async c => {
  const { db } = c.get("services");
  const templateRepo = new TemplateRepository(db);

  const body = await c.req.json();
  const { type, language, content } = body;

  if (!type || !content) {
    return c.json({ error: "Missing required fields: type, content" }, 400);
  }

  const templateId = await templateRepo.create({
    type,
    language: language || "id",
    content,
  });

  return c.json(
    { id: templateId, message: "Template created successfully" },
    201
  );
});

admin.get("/notifications/templates/:id", async c => {
  const { db } = c.get("services");
  const templateRepo = new TemplateRepository(db);

  const id = c.req.param("id");
  const template = await templateRepo.findById(id);

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json(template);
});

admin.put("/notifications/templates/:id", async c => {
  const { db } = c.get("services");
  const templateRepo = new TemplateRepository(db);

  const id = c.req.param("id");
  const body = await c.req.json();

  const template = await templateRepo.findById(id);
  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  await templateRepo.update(id, body);
  return c.json({ message: "Template updated successfully" });
});

admin.delete("/notifications/templates/:id", async c => {
  const { db } = c.get("services");
  const templateRepo = new TemplateRepository(db);

  const id = c.req.param("id");
  const template = await templateRepo.findById(id);

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  await templateRepo.delete(id);
  return c.json({ message: "Template deleted successfully" });
});

// Seed default templates endpoint
admin.post("/notifications/templates/seed", async c => {
  const { db } = c.get("services");

  try {
    await seedTemplates(db);
    return c.json({ message: "Templates seeded successfully" });
  } catch (error) {
    console.error("Error seeding templates:", error);
    return c.json({ error: "Failed to seed templates" }, 500);
  }
});

admin.route("/", billing);

export default admin;
