import { relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

// Users table - central identity for all actors
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["user", "admin"] })
    .notNull()
    .default("user"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Refresh tokens table - secure long-lived tokens for session management
export const refreshTokens = sqliteTable("refresh_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hashedToken: text("hashed_token").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Mitras table - business entities (UMKM)
export const mitras = sqliteTable("mitras", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  businessName: text("business_name").notNull(),
  address: text("address"),
  phone: text("phone"),
  lat: real("lat"),
  lng: real("lng"),
  subscriptionStatus: text("subscription_status", {
    enum: ["free_tier", "active", "past_due", "cancelled"],
  })
    .notNull()
    .default("free_tier"),
  activeDriverLimit: integer("active_driver_limit").notNull().default(2),
  hasCompletedOnboarding: integer("has_completed_onboarding", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
});

// Drivers table - many-to-many relationship between users and mitras
export const drivers = sqliteTable(
  "drivers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    mitraId: text("mitra_id")
      .notNull()
      .references(() => mitras.id),
    status: text("status", { enum: ["active", "inactive", "on_duty"] })
      .notNull()
      .default("active"),
  },
  table => ({
    drivers_mitra_user_idx: index("drivers_mitra_user_idx").on(
      table.mitraId,
      table.userId
    ),
  })
);

// Driver invites table - invitation management
export const driverInvites = sqliteTable("driver_invites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  mitraId: text("mitra_id")
    .notNull()
    .references(() => mitras.id),
  email: text("email").notNull(),
  token: text("token")
    .notNull()
    .unique()
    .$defaultFn(() => nanoid(32)),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["pending", "accepted"] })
    .notNull()
    .default("pending"),
});

// Vehicles table - mitra's fleet
export const vehicles = sqliteTable("vehicles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  mitraId: text("mitra_id")
    .notNull()
    .references(() => mitras.id),
  licensePlate: text("license_plate").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// Master tables for service configuration
export const masterVehicleTypes = sqliteTable("master_vehicle_types", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  icon: text("icon"),
});

export const masterPayloadTypes = sqliteTable("master_payload_types", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  icon: text("icon"),
});

export const masterFacilities = sqliteTable("master_facilities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  icon: text("icon"),
});

// Services table - configurable delivery services
export const services = sqliteTable("services", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  mitraId: text("mitra_id")
    .notNull()
    .references(() => mitras.id),
  name: text("name").notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  maxRangeKm: real("max_range_km"),
});

// Many-to-many link tables for services
export const servicesToVehicleTypes = sqliteTable(
  "services_to_vehicle_types",
  {
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    vehicleTypeId: text("vehicle_type_id")
      .notNull()
      .references(() => masterVehicleTypes.id, { onDelete: "cascade" }),
  },
  table => ({
    pk: index("services_to_vehicle_types_pk").on(
      table.serviceId,
      table.vehicleTypeId
    ),
  })
);

export const servicesToPayloadTypes = sqliteTable(
  "services_to_payload_types",
  {
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    payloadTypeId: text("payload_type_id")
      .notNull()
      .references(() => masterPayloadTypes.id, { onDelete: "cascade" }),
  },
  table => ({
    pk: index("services_to_payload_types_pk").on(
      table.serviceId,
      table.payloadTypeId
    ),
  })
);

export const servicesToFacilities = sqliteTable(
  "services_to_facilities",
  {
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    facilityId: text("facility_id")
      .notNull()
      .references(() => masterFacilities.id, { onDelete: "cascade" }),
  },
  table => ({
    pk: index("services_to_facilities_pk").on(
      table.serviceId,
      table.facilityId
    ),
  })
);

// Service rates table - pricing model
export const serviceRates = sqliteTable("service_rates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  baseFee: integer("base_fee").notNull(),
  feePerKm: integer("fee_per_km").notNull(),
  feePerKg: integer("fee_per_kg"),
  feePerItem: integer("fee_per_item"),
});

// Orders table - delivery jobs
export const orders = sqliteTable(
  "orders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    publicId: text("public_id")
      .notNull()
      .unique()
      .$defaultFn(() => nanoid(12)),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
    assignedDriverId: text("assigned_driver_id").references(() => drivers.id),
    assignedVehicleId: text("assigned_vehicle_id").references(
      () => vehicles.id
    ),
    status: text("status", {
      enum: [
        "pending_dispatch",
        "accepted",
        "pickup",
        "in_transit",
        "delivered",
        "cancelled",
        "claimed",
      ],
    })
      .notNull()
      .default("pending_dispatch"),
    ordererName: text("orderer_name").notNull(),
    ordererPhone: text("orderer_phone").notNull(),
    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    estimatedCost: integer("estimated_cost").notNull(),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  table => ({
    serviceStatusIdx: index("orders_service_status_idx").on(
      table.serviceId,
      table.status
    ),
    assignedDriverStatusIdx: index("orders_assigned_driver_status_idx").on(
      table.assignedDriverId,
      table.status
    ),
    createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
  })
);

// Order stops table - multi-stop architecture
export const orderStops = sqliteTable(
  "order_stops",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id),
    sequence: integer("sequence").notNull(),
    type: text("type", { enum: ["pickup", "dropoff"] }).notNull(),
    address: text("address").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    status: text("status", { enum: ["pending", "completed"] })
      .notNull()
      .default("pending"),
  },
  table => ({
    orderSequenceIdx: index("order_stops_order_sequence_idx").on(
      table.orderId,
      table.sequence
    ),
    orderStatusIdx: index("order_stops_order_status_idx").on(
      table.orderId,
      table.status
    ),
  })
);

// Order reports table - driver reports with photo evidence
export const orderReports = sqliteTable("order_reports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  driverId: text("driver_id")
    .notNull()
    .references(() => drivers.id),
  stage: text("stage", {
    enum: ["pickup", "transit_update", "dropoff"],
  }).notNull(),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Notification templates table - configurable message templates
export const notificationTemplates = sqliteTable("notification_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  type: text("type").notNull(), // Corresponds to NotificationType enum
  language: text("language").notNull().default("id"), // ISO 639-1 code
  content: text("content").notNull(), // e.g., "Order {{orderId}} is on its way!"
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// Notification logs table - wa.me notification tracking
export const notificationLogs = sqliteTable("notification_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id),
  templateId: text("template_id").references(() => notificationTemplates.id),
  recipientPhone: text("recipient_phone").notNull(),
  type: text("type").notNull(),
  status: text("status", { enum: ["generated", "triggered", "failed"] })
    .notNull()
    .default("generated"),
  generatedAt: integer("generated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  triggeredAt: integer("triggered_at", { mode: "timestamp" }),
});

// Driver locations table - location tracking
export const driverLocations = sqliteTable("driver_locations", {
  driverId: text("driver_id")
    .primaryKey()
    .references(() => drivers.id),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Audit logs table - generic tracking of significant user actions
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    actorId: text("actor_id").notNull(), // Changed from adminUserId to actorId for flexibility
    impersonatedMitraId: text("impersonated_mitra_id").references(
      () => mitras.id
    ),
    targetEntity: text("target_entity").notNull(),
    targetId: text("target_id").notNull(),
    eventType: text("event_type", {
      enum: [
        "ORDER_CREATED",
        "ORDER_UPDATED",
        "SERVICE_CREATED",
        "DRIVER_ASSIGNED",
        "MITRA_MANUAL_ORDER_CREATED",
        "MITRA_ORDER_ASSIGNED",
      ],
    }).notNull(), // Changed from action to eventType and added specific events
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
    timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  table => ({
    actorEventIdx: index("audit_logs_actor_event_idx").on(
      table.actorId,
      table.eventType
    ),
    timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
  })
);

// Invoices table - generic billing and payment tracking
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey(),
  publicId: text("public_id")
    .notNull()
    .unique()
    .$defaultFn(() => nanoid()),
  mitraId: text("mitra_id")
    .notNull()
    .references(() => mitras.id),
  type: text("type", {
    enum: ["PLATFORM_SUBSCRIPTION", "CUSTOMER_PAYMENT"],
  }).notNull(),
  status: text("status", { enum: ["pending", "paid", "overdue", "cancelled"] })
    .notNull()
    .default("pending"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("IDR"),
  description: text("description"),
  qrisPayload: text("qris_payload"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  mitras: many(mitras),
  drivers: many(drivers),
  auditLogs: many(auditLogs),
  refreshTokens: many(refreshTokens),
}));

export const mitrasRelations = relations(mitras, ({ one, many }) => ({
  user: one(users, {
    fields: [mitras.userId],
    references: [users.id],
  }),
  drivers: many(drivers),
  driverInvites: many(driverInvites),
  vehicles: many(vehicles),
  services: many(services),
  auditLogs: many(auditLogs),
  invoices: many(invoices),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  mitra: one(mitras, {
    fields: [drivers.mitraId],
    references: [mitras.id],
  }),
  orders: many(orders),
  orderReports: many(orderReports),
  location: one(driverLocations),
}));

export const driverInvitesRelations = relations(driverInvites, ({ one }) => ({
  mitra: one(mitras, {
    fields: [driverInvites.mitraId],
    references: [mitras.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  mitra: one(mitras, {
    fields: [vehicles.mitraId],
    references: [mitras.id],
  }),
  orders: many(orders),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  mitra: one(mitras, {
    fields: [services.mitraId],
    references: [mitras.id],
  }),
  serviceRates: many(serviceRates),
  orders: many(orders),
  vehicleTypes: many(servicesToVehicleTypes),
  payloadTypes: many(servicesToPayloadTypes),
  facilities: many(servicesToFacilities),
}));

export const servicesToVehicleTypesRelations = relations(
  servicesToVehicleTypes,
  ({ one }) => ({
    service: one(services, {
      fields: [servicesToVehicleTypes.serviceId],
      references: [services.id],
    }),
    vehicleType: one(masterVehicleTypes, {
      fields: [servicesToVehicleTypes.vehicleTypeId],
      references: [masterVehicleTypes.id],
    }),
  })
);

export const servicesToPayloadTypesRelations = relations(
  servicesToPayloadTypes,
  ({ one }) => ({
    service: one(services, {
      fields: [servicesToPayloadTypes.serviceId],
      references: [services.id],
    }),
    payloadType: one(masterPayloadTypes, {
      fields: [servicesToPayloadTypes.payloadTypeId],
      references: [masterPayloadTypes.id],
    }),
  })
);

export const servicesToFacilitiesRelations = relations(
  servicesToFacilities,
  ({ one }) => ({
    service: one(services, {
      fields: [servicesToFacilities.serviceId],
      references: [services.id],
    }),
    facility: one(masterFacilities, {
      fields: [servicesToFacilities.facilityId],
      references: [masterFacilities.id],
    }),
  })
);

export const masterVehicleTypesRelations = relations(
  masterVehicleTypes,
  ({ many }) => ({
    services: many(servicesToVehicleTypes),
  })
);

export const masterPayloadTypesRelations = relations(
  masterPayloadTypes,
  ({ many }) => ({
    services: many(servicesToPayloadTypes),
  })
);

export const masterFacilitiesRelations = relations(
  masterFacilities,
  ({ many }) => ({
    services: many(servicesToFacilities),
  })
);

export const serviceRatesRelations = relations(serviceRates, ({ one }) => ({
  service: one(services, {
    fields: [serviceRates.serviceId],
    references: [services.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  service: one(services, {
    fields: [orders.serviceId],
    references: [services.id],
  }),
  assignedDriver: one(drivers, {
    fields: [orders.assignedDriverId],
    references: [drivers.id],
  }),
  assignedVehicle: one(vehicles, {
    fields: [orders.assignedVehicleId],
    references: [vehicles.id],
  }),
  stops: many(orderStops),
  reports: many(orderReports),
  notificationLogs: many(notificationLogs),
}));

export const orderStopsRelations = relations(orderStops, ({ one }) => ({
  order: one(orders, {
    fields: [orderStops.orderId],
    references: [orders.id],
  }),
}));

export const orderReportsRelations = relations(orderReports, ({ one }) => ({
  order: one(orders, {
    fields: [orderReports.orderId],
    references: [orders.id],
  }),
  driver: one(drivers, {
    fields: [orderReports.driverId],
    references: [drivers.id],
  }),
}));

export const notificationTemplatesRelations = relations(
  notificationTemplates,
  ({ many }) => ({
    logs: many(notificationLogs),
  })
);

export const notificationLogsRelations = relations(
  notificationLogs,
  ({ one }) => ({
    order: one(orders, {
      fields: [notificationLogs.orderId],
      references: [orders.id],
    }),
    template: one(notificationTemplates, {
      fields: [notificationLogs.templateId],
      references: [notificationTemplates.id],
    }),
  })
);

export const driverLocationsRelations = relations(
  driverLocations,
  ({ one }) => ({
    driver: one(drivers, {
      fields: [driverLocations.driverId],
      references: [drivers.id],
    }),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  impersonatedMitra: one(mitras, {
    fields: [auditLogs.impersonatedMitraId],
    references: [mitras.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  mitra: one(mitras, {
    fields: [invoices.mitraId],
    references: [mitras.id],
  }),
}));
