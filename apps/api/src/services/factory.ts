import { createDbClient } from "@treksistem/db";
import { NotificationService } from "@treksistem/notifications";

import type { Bindings } from "../types";

import { AuditService } from "./audit.service";
import { BillingService } from "./billing.service";
import { DriverManagementService } from "./driver-management.service";
import { DriverWorkflowService } from "./driver-workflow.service";
import { LogbookService } from "./logbook.service";
import { MitraMonitoringService } from "./mitra-monitoring.service";
import { MitraOrderService } from "./mitra-order.service";
import { MitraProfileService } from "./mitra-profile.service";
import { MitraService } from "./mitra.service";
import { PublicOrderService } from "./public-order.service";
import { VehicleService } from "./vehicle.service";

export interface ServiceContainer {
  db: ReturnType<typeof createDbClient>;
  notificationService: NotificationService;
  auditService: AuditService;
  billingService: BillingService;
  driverManagementService: DriverManagementService;
  driverWorkflowService: DriverWorkflowService;
  logbookService: LogbookService;
  mitraMonitoringService: MitraMonitoringService;
  mitraOrderService: MitraOrderService;
  mitraProfileService: MitraProfileService;
  mitraService: MitraService;
  publicOrderService: PublicOrderService;
  vehicleService: VehicleService;
}

export function createServices(env: Bindings): ServiceContainer {
  const db = createDbClient(env.DB);

  const notificationService = new NotificationService(db);
  const auditService = new AuditService(db);
  const billingService = new BillingService(db);
  const driverManagementService = new DriverManagementService(db);
  const driverWorkflowService = new DriverWorkflowService(db);
  const logbookService = new LogbookService(db);
  const mitraMonitoringService = new MitraMonitoringService(db);
  const mitraOrderService = new MitraOrderService(
    db,
    notificationService,
    auditService
  );
  const mitraProfileService = new MitraProfileService(db);
  const mitraService = new MitraService(db);
  const publicOrderService = new PublicOrderService(db, notificationService);
  const vehicleService = new VehicleService(db, auditService);

  return {
    db,
    notificationService,
    auditService,
    billingService,
    driverManagementService,
    driverWorkflowService,
    logbookService,
    mitraMonitoringService,
    mitraOrderService,
    mitraProfileService,
    mitraService,
    publicOrderService,
    vehicleService,
  };
}
