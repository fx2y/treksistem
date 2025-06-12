// Database configuration and schema exports
export * from "./schema/index";
export * from "./client";

// Inferred types for all tables
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

import * as schema from "./schema/index";

// User types
export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

// Mitra types
export type Mitra = InferSelectModel<typeof schema.mitras>;
export type NewMitra = InferInsertModel<typeof schema.mitras>;

// Driver types
export type Driver = InferSelectModel<typeof schema.drivers>;
export type NewDriver = InferInsertModel<typeof schema.drivers>;

// Driver invite types
export type DriverInvite = InferSelectModel<typeof schema.driverInvites>;
export type NewDriverInvite = InferInsertModel<typeof schema.driverInvites>;

// Vehicle types
export type Vehicle = InferSelectModel<typeof schema.vehicles>;
export type NewVehicle = InferInsertModel<typeof schema.vehicles>;

// Master table types
export type MasterVehicleType = InferSelectModel<
  typeof schema.masterVehicleTypes
>;
export type NewMasterVehicleType = InferInsertModel<
  typeof schema.masterVehicleTypes
>;

export type MasterPayloadType = InferSelectModel<
  typeof schema.masterPayloadTypes
>;
export type NewMasterPayloadType = InferInsertModel<
  typeof schema.masterPayloadTypes
>;

export type MasterFacility = InferSelectModel<typeof schema.masterFacilities>;
export type NewMasterFacility = InferInsertModel<
  typeof schema.masterFacilities
>;

// Service types
export type Service = InferSelectModel<typeof schema.services>;
export type NewService = InferInsertModel<typeof schema.services>;

export type ServiceRate = InferSelectModel<typeof schema.serviceRates>;
export type NewServiceRate = InferInsertModel<typeof schema.serviceRates>;

// Order types
export type Order = InferSelectModel<typeof schema.orders>;
export type NewOrder = InferInsertModel<typeof schema.orders>;

export type OrderStop = InferSelectModel<typeof schema.orderStops>;
export type NewOrderStop = InferInsertModel<typeof schema.orderStops>;

export type OrderReport = InferSelectModel<typeof schema.orderReports>;
export type NewOrderReport = InferInsertModel<typeof schema.orderReports>;

// Notification log types
export type NotificationLog = InferSelectModel<typeof schema.notificationLogs>;
export type NewNotificationLog = InferInsertModel<
  typeof schema.notificationLogs
>;

// Driver location types
export type DriverLocation = InferSelectModel<typeof schema.driverLocations>;
export type NewDriverLocation = InferInsertModel<typeof schema.driverLocations>;

// Audit log types
export type AuditLog = InferSelectModel<typeof schema.auditLogs>;
export type NewAuditLog = InferInsertModel<typeof schema.auditLogs>;

// Refresh token types
export type RefreshToken = InferSelectModel<typeof schema.refreshTokens>;
export type NewRefreshToken = InferInsertModel<typeof schema.refreshTokens>;
