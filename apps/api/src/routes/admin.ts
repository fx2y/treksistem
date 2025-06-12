import type { createAuthServices } from "@treksistem/auth";
import {
  createDbClient,
  masterVehicleTypes,
  masterPayloadTypes,
  masterFacilities,
  mitras,
  users,
  driverInvites,
  services,
  type NewDriverInvite,
  type NewService,
} from "@treksistem/db";
import * as schema from "@treksistem/db";
import { TemplateRepository, seedTemplates } from "@treksistem/notifications";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { nanoid } from "nanoid";

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

// Use centralized audit service
async function logAdminAction(
  auditService: any,
  adminUserId: string,
  targetEntity: string,
  targetId: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN" | "INVITE",
  payload: Record<string, unknown>
) {
  try {
    await auditService.logAdminAction({
      adminUserId,
      targetEntity,
      targetId,
      action,
      payload,
    });
  } catch (error) {
    console.error("Audit logging failed:", error);
    // Continue with the request even if audit logging fails
  }
}

// Get all mitras
admin.get("/mitras", async c => {
  const db = createDbClient(c.env.DB);

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
  const db = createDbClient(c.env.DB);

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
  const db = createDbClient(c.env.DB);
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
  const { auditService } = c.get("authServices");
  await logAdminAction(
    auditService,
    payload.userId,
    category,
    created.id,
    "CREATE",
    {
      name,
      icon,
    }
  );

  return c.json(created, 201);
});

// Update master data item
admin.put("/master-data/:category/:itemId", async c => {
  const category = c.req.param("category");
  const itemId = c.req.param("itemId");
  const { name, icon } = await c.req.json();
  const db = createDbClient(c.env.DB);
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

  const { auditService } = c.get("authServices");
  await logAdminAction(
    auditService,
    payload.userId,
    category,
    itemId,
    "UPDATE",
    {
      name,
      icon,
    }
  );

  return c.json(result[0]);
});

// Delete master data item
admin.delete("/master-data/:category/:itemId", async c => {
  const category = c.req.param("category");
  const itemId = c.req.param("itemId");
  const db = createDbClient(c.env.DB);
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

  const { auditService } = c.get("authServices");
  await logAdminAction(
    auditService,
    payload.userId,
    category,
    itemId,
    "DELETE",
    {
      deletedItem: result[0],
    }
  );

  return c.body(null, 204);
});

// Create service on behalf of a mitra
admin.post("/mitras/:mitraId/services", async c => {
  const mitraId = c.req.param("mitraId");
  const serviceData = await c.req.json();
  const db = createDbClient(c.env.DB);
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

  const { auditService } = c.get("authServices");
  await logAdminAction(
    auditService,
    payload.userId,
    "service",
    created.id,
    "CREATE",
    {
      mitraId,
      ...serviceData,
    }
  );

  return c.json(created, 201);
});

// Invite driver on behalf of a mitra
admin.post("/mitras/:mitraId/drivers/invite", async c => {
  const mitraId = c.req.param("mitraId");
  const { email } = await c.req.json();
  const db = createDbClient(c.env.DB);
  const payload = c.get("jwtPayload");

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

  // Create driver invite
  const inviteToken = nanoid(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const newInvite: NewDriverInvite = {
    mitraId,
    email,
    token: inviteToken,
    expiresAt,
    status: "pending",
  };

  const result = await db.insert(driverInvites).values(newInvite).returning();
  const created = result[0];

  const { auditService } = c.get("authServices");
  await logAdminAction(
    auditService,
    payload.userId,
    "driver_invite",
    created.id,
    "INVITE",
    { mitraId, email }
  );

  // Generate invite link
  const inviteLink = `${c.env.FRONTEND_URL}/join?token=${inviteToken}`;

  return c.json({ inviteLink });
});

// Notification Template Management API
admin.get("/notifications/templates", async c => {
  const db = drizzle(c.env.DB, { schema });
  const templateRepo = new TemplateRepository(db);

  const templates = await templateRepo.findAll();
  return c.json(templates);
});

admin.post("/notifications/templates", async c => {
  const db = drizzle(c.env.DB, { schema });
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
  const db = drizzle(c.env.DB, { schema });
  const templateRepo = new TemplateRepository(db);

  const id = c.req.param("id");
  const template = await templateRepo.findById(id);

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json(template);
});

admin.put("/notifications/templates/:id", async c => {
  const db = drizzle(c.env.DB, { schema });
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
  const db = drizzle(c.env.DB, { schema });
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
  const db = drizzle(c.env.DB, { schema });

  try {
    await seedTemplates(db);
    return c.json({ message: "Templates seeded successfully" });
  } catch (error) {
    console.error("Error seeding templates:", error);
    return c.json({ error: "Failed to seed templates" }, 500);
  }
});

export default admin;
