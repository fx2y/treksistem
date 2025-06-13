import {
  orders,
  orderStops,
  orderReports,
  drivers,
  auditLogs,
} from "@treksistem/db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface OrderStopDetails {
  id: string;
  sequence: number;
  type: "pickup" | "dropoff";
  address: string;
  lat: number;
  lng: number;
  status: "pending" | "completed";
}

export interface DriverOrder {
  id: string;
  publicId: string;
  status: string;
  ordererName: string;
  recipientName: string;
  stops: OrderStopDetails[];
}

export interface UpdateDriverStatusRequest {
  status: "active" | "inactive";
}

export interface UpdateOrderStatusRequest {
  status: "accepted" | "pickup" | "in_transit" | "delivered" | "cancelled";
}

export interface SubmitReportRequest {
  stage: "pickup" | "dropoff" | "transit_update";
  notes?: string;
  photoUrl?: string;
}

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending_dispatch: ["accepted", "cancelled"],
  accepted: ["pickup", "cancelled"],
  pickup: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export class DriverWorkflowService {
  constructor(private db: any) {}

  async getAssignedOrders(driverId: string): Promise<DriverOrder[]> {
    const orderList = await this.db
      .select({
        id: orders.id,
        publicId: orders.publicId,
        status: orders.status,
        ordererName: orders.ordererName,
        recipientName: orders.recipientName,
      })
      .from(orders)
      .where(eq(orders.assignedDriverId, driverId));

    const ordersWithStops: DriverOrder[] = [];

    for (const order of orderList) {
      const stops = await this.db
        .select({
          id: orderStops.id,
          sequence: orderStops.sequence,
          type: orderStops.type,
          address: orderStops.address,
          lat: orderStops.lat,
          lng: orderStops.lng,
          status: orderStops.status,
        })
        .from(orderStops)
        .where(eq(orderStops.orderId, order.id))
        .orderBy(orderStops.sequence);

      ordersWithStops.push({
        id: order.id,
        publicId: order.publicId,
        status: order.status,
        ordererName: order.ordererName,
        recipientName: order.recipientName,
        stops: stops.map((stop: any) => ({
          id: stop.id,
          sequence: stop.sequence,
          type: stop.type as "pickup" | "dropoff",
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
          status: stop.status as "pending" | "completed",
        })),
      });
    }

    return ordersWithStops;
  }

  async updateDriverAvailability(
    driverId: string,
    status: "active" | "inactive"
  ): Promise<void> {
    const auditLogInsert = this.db.insert(auditLogs).values({
      actorId: driverId,
      targetEntity: "driver",
      targetId: driverId,
      action: "DRIVER_AVAILABILITY_CHANGED",
      payload: JSON.stringify({ status }),
    });

    const driverUpdate = this.db
      .update(drivers)
      .set({ status })
      .where(eq(drivers.id, driverId));

    await this.db.batch([auditLogInsert, driverUpdate]);
  }

  async updateOrderStatus(
    driverId: string,
    orderId: string,
    newStatus: string
  ): Promise<void> {
    const order = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.assignedDriverId, driverId)))
      .get();

    if (!order) {
      throw new Error("Order not found or not assigned to this driver");
    }

    const validTransitions = ORDER_STATUS_TRANSITIONS[order.status] || [];
    if (!validTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${order.status} to ${newStatus}`
      );
    }

    const auditLogInsert = this.db.insert(auditLogs).values({
      actorId: driverId,
      targetEntity: "order",
      targetId: orderId,
      action: "ORDER_STATUS_UPDATED",
      payload: JSON.stringify({
        previousStatus: order.status,
        newStatus,
      }),
    });

    const orderUpdate = this.db
      .update(orders)
      .set({ status: newStatus })
      .where(eq(orders.id, orderId));

    await this.db.batch([auditLogInsert, orderUpdate]);
  }

  async completeOrderStop(
    driverId: string,
    orderId: string,
    stopId: string
  ): Promise<void> {
    const order = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.assignedDriverId, driverId)))
      .get();

    if (!order) {
      throw new Error("Order not found or not assigned to this driver");
    }

    const stop = await this.db
      .select()
      .from(orderStops)
      .where(and(eq(orderStops.id, stopId), eq(orderStops.orderId, orderId)))
      .get();

    if (!stop) {
      throw new Error("Stop not found for this order");
    }

    const auditLogInsert = this.db.insert(auditLogs).values({
      actorId: driverId,
      targetEntity: "order_stop",
      targetId: stopId,
      action: "ORDER_STOP_COMPLETED",
      payload: JSON.stringify({
        orderId,
        stopSequence: stop.sequence,
        stopType: stop.type,
      }),
    });

    const stopUpdate = this.db
      .update(orderStops)
      .set({ status: "completed" })
      .where(eq(orderStops.id, stopId));

    await this.db.batch([auditLogInsert, stopUpdate]);
  }

  async submitReport(
    driverId: string,
    orderId: string,
    reportData: SubmitReportRequest
  ): Promise<void> {
    const order = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.assignedDriverId, driverId)))
      .get();

    if (!order) {
      throw new Error("Order not found or not assigned to this driver");
    }

    const reportInsert = this.db.insert(orderReports).values({
      orderId,
      stage: reportData.stage,
      notes: reportData.notes,
      photoUrl: reportData.photoUrl,
      timestamp: new Date(),
    });

    const auditLogInsert = this.db.insert(auditLogs).values({
      actorId: driverId,
      targetEntity: "order_report",
      targetId: nanoid(),
      action: "REPORT_SUBMITTED",
      payload: JSON.stringify({
        orderId,
        stage: reportData.stage,
        notes: reportData.notes,
        photoUrl: reportData.photoUrl,
      }),
    });

    const operations = [reportInsert, auditLogInsert];

    if (reportData.stage === "dropoff") {
      const orderUpdate = this.db
        .update(orders)
        .set({ status: "delivered" })
        .where(eq(orders.id, orderId));
      operations.push(orderUpdate);
    }

    await this.db.batch(operations);
  }
}
