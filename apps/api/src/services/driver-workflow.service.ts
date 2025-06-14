import {
  orders,
  orderStops,
  orderReports,
  drivers,
  auditLogs,
  services,
  type DbClient,
} from "@treksistem/db";
import { eq, and, isNull } from "drizzle-orm";

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
  pending_dispatch: ["accepted", "cancelled", "claimed"],
  claimed: ["accepted", "cancelled"],
  accepted: ["pickup", "cancelled"],
  pickup: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export class DriverWorkflowService {
  constructor(private db: DbClient) {}

  async getAssignedOrders(driverId: string): Promise<DriverOrder[]> {
    const orderList = await this.db.query.orders.findMany({
      where: eq(orders.assignedDriverId, driverId),
      with: {
        stops: {
          orderBy: (stops, { asc }) => [asc(stops.sequence)],
        },
      },
    });

    return orderList.map(order => ({
      id: order.id,
      publicId: order.publicId,
      status: order.status,
      ordererName: order.ordererName,
      recipientName: order.recipientName,
      stops: order.stops.map(stop => ({
        id: stop.id,
        sequence: stop.sequence,
        type: stop.type as "pickup" | "dropoff",
        address: stop.address,
        lat: stop.lat,
        lng: stop.lng,
        status: stop.status as "pending" | "completed",
      })),
    }));
  }

  async updateDriverAvailability(
    driverId: string,
    status: "active" | "inactive"
  ): Promise<void> {
    const auditLogInsert = this.db.insert(auditLogs).values({
      adminUserId: driverId,
      targetEntity: "driver",
      targetId: driverId,
      action: "UPDATE",
      payload: { action: "DRIVER_AVAILABILITY_CHANGED", status },
    });

    const driverUpdate = this.db
      .update(drivers)
      .set({ status })
      .where(eq(drivers.id, driverId));

    await auditLogInsert;
    await driverUpdate;
  }

  async updateOrderStatus(
    driverId: string,
    orderId: string,
    newStatus:
      | "pending_dispatch"
      | "accepted"
      | "pickup"
      | "in_transit"
      | "delivered"
      | "cancelled"
      | "claimed"
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
      adminUserId: driverId,
      targetEntity: "order",
      targetId: orderId,
      action: "UPDATE",
      payload: {
        action: "ORDER_STATUS_UPDATED",
        previousStatus: order.status,
        newStatus,
      },
    });

    const orderUpdate = this.db
      .update(orders)
      .set({ status: newStatus })
      .where(eq(orders.id, orderId));

    await auditLogInsert;
    await orderUpdate;
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
      adminUserId: driverId,
      targetEntity: "order_stop",
      targetId: stopId,
      action: "UPDATE",
      payload: {
        action: "ORDER_STOP_COMPLETED",
        orderId,
        stopSequence: stop.sequence,
        stopType: stop.type,
      },
    });

    const stopUpdate = this.db
      .update(orderStops)
      .set({ status: "completed" })
      .where(eq(orderStops.id, stopId));

    await auditLogInsert;
    await stopUpdate;
  }

  async claimOrder(params: {
    orderId: string;
    claimingDriverId: string;
  }): Promise<{ success: boolean; message: string; httpStatus: number }> {
    const { orderId, claimingDriverId } = params;

    // First, verify the order exists and is in the correct state
    const order = await this.db
      .select({
        id: orders.id,
        publicId: orders.publicId,
        status: orders.status,
        serviceId: orders.serviceId,
        assignedDriverId: orders.assignedDriverId,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .get();

    if (!order) {
      return {
        success: false,
        message: "Order not found",
        httpStatus: 404,
      };
    }

    if (order.status !== "pending_dispatch") {
      return {
        success: false,
        message: "Order is not available for claiming",
        httpStatus: 400,
      };
    }

    // Verify the driver belongs to the same mitra as the order's service
    const driverMitra = await this.db
      .select({
        mitraId: drivers.mitraId,
      })
      .from(drivers)
      .where(eq(drivers.id, claimingDriverId))
      .get();

    if (!driverMitra) {
      return {
        success: false,
        message: "Driver not found",
        httpStatus: 404,
      };
    }

    const orderService = await this.db
      .select({
        mitraId: services.mitraId,
      })
      .from(services)
      .where(eq(services.id, order.serviceId))
      .get();

    if (!orderService) {
      return {
        success: false,
        message: "Service not found",
        httpStatus: 404,
      };
    }

    if (driverMitra.mitraId !== orderService.mitraId) {
      return {
        success: false,
        message: "Order not found or not available to this driver",
        httpStatus: 404,
      };
    }

    // Attempt atomic claim using UPDATE WHERE with null check
    const updateResult = await this.db
      .update(orders)
      .set({
        assignedDriverId: claimingDriverId,
        status: "claimed" as const,
      })
      .where(and(eq(orders.id, orderId), isNull(orders.assignedDriverId)))
      .run();

    // Check if the update affected any rows
    if ((updateResult as any).changes === 0) {
      return {
        success: false,
        message: "Order has already been claimed",
        httpStatus: 409,
      };
    }

    // Create audit log for successful claim
    await this.db.insert(auditLogs).values({
      adminUserId: claimingDriverId,
      targetEntity: "order",
      targetId: orderId,
      action: "DRIVER_ASSIGNED",
      payload: {
        orderPublicId: order.publicId,
        previousStatus: "pending_dispatch",
        newStatus: "claimed",
      },
    });

    return {
      success: true,
      message: `Order ${order.publicId} claimed successfully`,
      httpStatus: 200,
    };
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
      driverId,
      stage: reportData.stage,
      notes: reportData.notes,
      photoUrl: reportData.photoUrl,
      timestamp: new Date(),
    });

    const auditLogInsert = this.db.insert(auditLogs).values({
      adminUserId: driverId,
      targetEntity: "order_report",
      targetId: orderId,
      action: "CREATE",
      payload: {
        action: "REPORT_SUBMITTED",
        orderId,
        stage: reportData.stage,
        notes: reportData.notes,
        photoUrl: reportData.photoUrl,
      },
    });

    // Execute operations sequentially
    await reportInsert;
    await auditLogInsert;

    if (reportData.stage === "dropoff") {
      await this.db
        .update(orders)
        .set({ status: "delivered" as const })
        .where(eq(orders.id, orderId));
    }
  }
}
