import {
  orders,
  orderStops,
  auditLogs,
  services,
  serviceRates,
  drivers,
  vehicles,
} from "@treksistem/db";
import { getDistance } from "@treksistem/geo";
import { NotificationService } from "@treksistem/notifications";
import { eq, and } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { nanoid } from "nanoid";

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
    private db: DrizzleD1Database<any>,
    private notificationService: NotificationService
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

    const orderId = nanoid();
    const publicId = nanoid(12);

    // Prepare database batch operations
    const orderData = {
      id: orderId,
      publicId,
      serviceId: input.serviceId,
      assignedDriverId: input.assignToDriverId || null,
      assignedVehicleId: input.assignToVehicleId || null,
      status: input.assignToDriverId ? "accepted" : "pending_dispatch",
      ordererName: input.ordererName,
      ordererPhone: input.ordererPhone,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      estimatedCost,
      notes: input.notes || null,
    };

    const stopOperations = input.stops.map((stop, index) =>
      this.db.insert(orderStops).values({
        id: nanoid(),
        orderId,
        sequence: index + 1,
        type: stop.type,
        address: stop.address,
        lat: stop.lat,
        lng: stop.lng,
        status: "pending",
      })
    );

    const auditLogData = {
      id: nanoid(),
      actorId,
      impersonatedMitraId: null,
      targetEntity: "orders",
      targetId: orderId,
      eventType: "ORDER_CREATED", // Will be mapped to MITRA_MANUAL_ORDER_CREATED
      payload: {
        serviceId: input.serviceId,
        stopCount: input.stops.length,
        estimatedCost,
        assignedDriverId: input.assignToDriverId,
      },
      timestamp: new Date(),
    };

    // Execute atomic transaction
    await this.db.batch([
      this.db.insert(orders).values(orderData),
      ...stopOperations,
      this.db.insert(auditLogs).values(auditLogData),
    ]);

    let notification;
    if (input.sendNotifications) {
      try {
        const notificationResult = await this.notificationService.generate(
          "order_created",
          {
            orderId: publicId,
            recipientName: input.recipientName,
          },
          {
            recipientPhone: input.recipientPhone,
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

    const auditLogData = {
      id: nanoid(),
      actorId,
      impersonatedMitraId: null,
      targetEntity: "orders",
      targetId: orderId,
      eventType: "DRIVER_ASSIGNED", // Will be mapped to MITRA_ORDER_ASSIGNED
      payload: {
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        previousStatus: "pending_dispatch",
        newStatus: "accepted",
      },
      timestamp: new Date(),
    };

    // Execute atomic transaction
    await this.db.batch([
      this.db
        .update(orders)
        .set({
          assignedDriverId: input.driverId,
          assignedVehicleId: input.vehicleId || null,
          status: "accepted",
        })
        .where(eq(orders.id, orderId)),
      this.db.insert(auditLogs).values(auditLogData),
    ]);

    return {
      orderId,
      status: "accepted",
    };
  }
}
