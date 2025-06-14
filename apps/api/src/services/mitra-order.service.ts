import {
  orders,
  orderStops,
  services,
  serviceRates,
  drivers,
  vehicles,
} from "@treksistem/db";
import type { DbClient } from "@treksistem/db";
import { getDistance } from "@treksistem/geo";
import { NotificationService } from "@treksistem/notifications";
import { eq, and } from "drizzle-orm";

import { AuditService } from "./audit.service";

export interface StopInput {
  address: string;
  lat: number;
  lng: number;
  type: "pickup" | "dropoff";
}

export interface CreateManualOrderRequest {
  serviceId: string;
  stops: StopInput[];
  ordererName: string;
  ordererPhone: string;
  recipientName: string;
  recipientPhone: string;
  notes?: string;
  assignToDriverId?: string;
  assignToVehicleId?: string;
  sendNotifications: boolean;
}

export interface CreateManualOrderResponse {
  orderId: string;
  publicId: string;
  trackingUrl: string;
  estimatedCost: number;
  notification?: {
    logId: string;
    waLink: string;
    message: string;
  };
}

export interface AssignOrderRequest {
  driverId: string;
  vehicleId?: string;
}

export interface AssignOrderResponse {
  orderId: string;
  status: "accepted";
}

export class MitraOrderService {
  constructor(
    private db: DbClient,
    private notificationService: NotificationService,
    private auditService: AuditService
  ) {}

  async createManualOrder(
    mitraId: string,
    actorId: string,
    input: CreateManualOrderRequest
  ): Promise<CreateManualOrderResponse> {
    // Validate service belongs to mitra
    const serviceResult = await this.db
      .select()
      .from(services)
      .where(
        and(eq(services.id, input.serviceId), eq(services.mitraId, mitraId))
      )
      .limit(1);

    if (serviceResult.length === 0) {
      throw new Error("Service not found or not owned by mitra");
    }

    // Validate driver if provided
    if (input.assignToDriverId) {
      const driverResult = await this.db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.id, input.assignToDriverId),
            eq(drivers.mitraId, mitraId)
          )
        )
        .limit(1);

      if (driverResult.length === 0) {
        throw new Error("Driver not found or not owned by mitra");
      }
    }

    // Validate vehicle if provided
    if (input.assignToVehicleId) {
      const vehicleResult = await this.db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.id, input.assignToVehicleId),
            eq(vehicles.mitraId, mitraId)
          )
        )
        .limit(1);

      if (vehicleResult.length === 0) {
        throw new Error("Vehicle not found or not owned by mitra");
      }
    }

    // Calculate total distance for cost estimation
    let totalDistance = 0;
    for (let i = 0; i < input.stops.length - 1; i++) {
      const origin = { lat: input.stops[i].lat, lng: input.stops[i].lng };
      const destination = {
        lat: input.stops[i + 1].lat,
        lng: input.stops[i + 1].lng,
      };
      const distanceResult = await getDistance(origin, destination);
      totalDistance += distanceResult.distanceKm;
    }

    // Get service rates for cost calculation
    const serviceRateResult = await this.db
      .select()
      .from(serviceRates)
      .where(eq(serviceRates.serviceId, input.serviceId))
      .limit(1);

    let estimatedCost = 10000; // Default minimum fee
    if (serviceRateResult.length > 0) {
      const rate = serviceRateResult[0];
      estimatedCost = rate.baseFee + rate.feePerKm * totalDistance;
    }

    // Prepare database batch operations
    const orderData = {
      serviceId: input.serviceId,
      assignedDriverId: input.assignToDriverId || null,
      assignedVehicleId: input.assignToVehicleId || null,
      status: input.assignToDriverId
        ? ("accepted" as const)
        : ("pending_dispatch" as const),
      ordererName: input.ordererName,
      ordererPhone: input.ordererPhone,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      estimatedCost,
      notes: input.notes || null,
    };

    // Use transaction for atomic order creation
    const { orderId, publicId } = await this.db.transaction(async (tx) => {
      const [insertedOrder] = await tx
        .insert(orders)
        .values(orderData)
        .returning({ id: orders.id, publicId: orders.publicId });
      const { id: orderId, publicId } = insertedOrder;

      // Insert stops with the order ID - sequential inserts for proper relationship handling
      for (const [index, stop] of input.stops.entries()) {
        await tx.insert(orderStops).values({
          orderId,
          sequence: index + 1,
          type: stop.type,
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
          status: "pending" as const,
        });
      }

      return { orderId, publicId };
    });

    // Log audit event
    await this.auditService.log({
      actorId,
      mitraId,
      entityType: "ORDER",
      entityId: orderId,
      eventType: "MITRA_MANUAL_ORDER_CREATED",
      details: {
        serviceId: input.serviceId,
        stopCount: input.stops.length,
        estimatedCost,
        assignedDriverId: input.assignToDriverId,
      },
    });

    let notification;
    if (input.sendNotifications) {
      try {
        const notificationResult = await this.notificationService.generate(
          "TRACKING_LINK_FOR_CUSTOMER",
          {
            type: "TRACKING_LINK_FOR_CUSTOMER",
            data: {
              recipientPhone: input.recipientPhone,
              trackingUrl: `${process.env.PUBLIC_URL}/track/${publicId}`,
              mitraName: "Treksistem",
            },
          },
          {
            orderId: publicId,
          }
        );

        notification = {
          logId: notificationResult.logId,
          waLink: notificationResult.notification.waLink,
          message: notificationResult.notification.message,
        };
      } catch (error) {
        // Don't fail the order creation if notification fails
        console.error("Failed to generate notification:", error);
      }
    }

    return {
      orderId,
      publicId,
      trackingUrl: `${process.env.PUBLIC_URL}/track/${publicId}`,
      estimatedCost,
      notification,
    };
  }

  async assignOrder(
    mitraId: string,
    actorId: string,
    orderId: string,
    input: AssignOrderRequest
  ): Promise<AssignOrderResponse> {
    // Validate order belongs to mitra's service
    const orderResult = await this.db
      .select({
        id: orders.id,
        status: orders.status,
        serviceId: orders.serviceId,
      })
      .from(orders)
      .innerJoin(services, eq(orders.serviceId, services.id))
      .where(and(eq(orders.id, orderId), eq(services.mitraId, mitraId)))
      .limit(1);

    if (orderResult.length === 0) {
      throw new Error("Order not found or not owned by mitra");
    }

    const order = orderResult[0];
    if (order.status !== "pending_dispatch") {
      throw new Error("Order is not in pending_dispatch status");
    }

    // Validate driver belongs to mitra
    const driverResult = await this.db
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, input.driverId), eq(drivers.mitraId, mitraId)))
      .limit(1);

    if (driverResult.length === 0) {
      throw new Error("Driver not found or not owned by mitra");
    }

    // Validate vehicle if provided
    if (input.vehicleId) {
      const vehicleResult = await this.db
        .select()
        .from(vehicles)
        .where(
          and(eq(vehicles.id, input.vehicleId), eq(vehicles.mitraId, mitraId))
        )
        .limit(1);

      if (vehicleResult.length === 0) {
        throw new Error("Vehicle not found or not owned by mitra");
      }
    }

    // Execute atomic transaction
    await this.db
      .update(orders)
      .set({
        assignedDriverId: input.driverId,
        assignedVehicleId: input.vehicleId || null,
        status: "accepted" as const,
      })
      .where(eq(orders.id, orderId));

    // Log audit event
    await this.auditService.log({
      actorId,
      mitraId,
      entityType: "ORDER",
      entityId: orderId,
      eventType: "MITRA_ORDER_ASSIGNED",
      details: {
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        previousStatus: "pending_dispatch",
        newStatus: "accepted",
      },
    });

    return {
      orderId,
      status: "accepted" as const,
    };
  }
}
