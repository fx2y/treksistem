import { createDbClient } from "@treksistem/db";
import { NotificationService } from "@treksistem/notifications";
import { createAuthServices } from "@treksistem/auth";

import type { Bindings } from "../types";

import { AuditService } from "./audit.service";
import { AuthService } from "./auth.service";
import { BillingService } from "./billing.service";
import { DriverManagementService } from "./driver-management.service";
import { DriverWorkflowService } from "./driver-workflow.service";
import { LogbookService } from "./logbook.service";
import { MasterDataService } from "./master-data.service";
import { MitraMonitoringService } from "./mitra-monitoring.service";
import { MitraOrderService } from "./mitra-order.service";
import { MitraProfileService } from "./mitra-profile.service";
import { MitraServiceManagementService } from "./mitra-service-management.service";
import { PublicOrderService } from "./public-order.service";
import { RateLimitService } from "./rate-limit.service";
import { SchemaValidationService } from "./schema-validation.service";
import { TestService } from "./test.service";
import { UploadService } from "./upload.service";
import { VehicleService } from "./vehicle.service";

export interface ServiceContainer {
  db: ReturnType<typeof createDbClient>;
  notificationService: NotificationService;
  auditService: AuditService;
  authService: AuthService;
  billingService: BillingService;
  driverManagementService: DriverManagementService;
  driverWorkflowService: DriverWorkflowService;
  logbookService: LogbookService;
  mitraMonitoringService: MitraMonitoringService;
  mitraOrderService: MitraOrderService;
  mitraProfileService: MitraProfileService;
  mitraServiceManagementService: MitraServiceManagementService;
  masterDataService: MasterDataService;
  publicOrderService: PublicOrderService;
  rateLimitService: RateLimitService;
  schemaValidationService: SchemaValidationService;
  testService: TestService;
  uploadService: UploadService;
  vehicleService: VehicleService;
}

export function createServices(env: Bindings): ServiceContainer {
  const db = createDbClient(env.DB);

  const notificationService = new NotificationService(db);
  const auditService = new AuditService(db);

  // Create auth services
  const authServices = createAuthServices(env);
  const authService = new AuthService({
    db,
    googleProvider: authServices.googleProvider,
    jwtService: authServices.jwtService,
    refreshTokenService: authServices.refreshTokenService,
    frontendUrl: env.FRONTEND_URL,
    auditService,
  });
  const billingService = new BillingService(db, auditService);
  const driverManagementService = new DriverManagementService(db, auditService);
  const driverWorkflowService = new DriverWorkflowService(db);
  const logbookService = new LogbookService(db);
  const mitraMonitoringService = new MitraMonitoringService(db);
  const mitraOrderService = new MitraOrderService(
    db,
    notificationService,
    auditService
  );
  const mitraProfileService = new MitraProfileService(db, auditService);
  const mitraServiceManagementService = new MitraServiceManagementService(db, auditService);
  const masterDataService = new MasterDataService(db);
  const publicOrderService = new PublicOrderService(db, notificationService, auditService);
  const rateLimitService = new RateLimitService({ db });
  const schemaValidationService = new SchemaValidationService({ db });
  const testService = new TestService(db, env.DB);
  const uploadService = new UploadService(db, env);
  const vehicleService = new VehicleService(db, auditService);

  return {
    db,
    notificationService,
    auditService,
    authService,
    billingService,
    driverManagementService,
    driverWorkflowService,
    logbookService,
    mitraMonitoringService,
    mitraOrderService,
    mitraProfileService,
    mitraServiceManagementService,
    masterDataService,
    publicOrderService,
    rateLimitService,
    schemaValidationService,
    testService,
    uploadService,
    vehicleService,
  };
}
