import * as schema from "@treksistem/db";
import { getDistance } from "@treksistem/geo";
import { NotificationService } from "@treksistem/notifications";
import { and, eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { nanoid } from "nanoid";

export interface StopInput {
  address: string;
  lat: number;
  lng: number;
  type: "pickup" | "dropoff";
}

export interface ServiceDiscoveryRequest {
  lat: number;
  lng: number;
  payloadTypeId: string;
}

export interface ServiceDiscoveryResponse {
  serviceId: string;
  serviceName: string;
  mitraId: string;
  mitraName: string;
}

export interface QuoteRequest {
  serviceId: string;
  stops: StopInput[];
}

export interface QuoteResponse {
  estimatedCost: number;
  totalDistanceKm: number;
}

export interface OrderCreationRequest {
  serviceId: string;
  stops: StopInput[];
  ordererName: string;
  ordererPhone: string;
  recipientName: string;
  recipientPhone: string;
  notes?: string;
}

export interface OrderCreationResponse {
  orderId: number;
  publicId: string;
  trackingUrl: string;
  notificationLogId: string;
}

export interface OrderTrackingResponse {
  publicId: string;
  status: string;
  estimatedCost: number;
  stops: {
    sequence: number;
    type: string;
    address: string;
    status: string;
  }[];
  reports: {
    stage: string;
    notes?: string;
    photoUrl?: string;
    timestamp: string;
  }[];
}

export class PublicOrderService {
  constructor(
    private db: DrizzleD1Database<typeof schema>,
    private notificationService: NotificationService
  ) {}

  async findAvailableServices(
    params: ServiceDiscoveryRequest
  ): Promise<ServiceDiscoveryResponse[]> {
    const servicesData = await this.db
      .select({
        serviceId: schema.services.id,
        serviceName: schema.services.name,
        mitraId: schema.services.mitraId,
        mitraName: schema.mitras.businessName,
      })
      .from(schema.services)
      .innerJoin(schema.mitras, eq(schema.services.mitraId, schema.mitras.id))
      .innerJoin(
        schema.servicesToPayloadTypes,
        eq(schema.services.id, schema.servicesToPayloadTypes.serviceId)
      )
      .where(
        and(
          eq(schema.services.isPublic, true),
          eq(schema.servicesToPayloadTypes.payloadTypeId, params.payloadTypeId)
        )
      );

    return servicesData.map(service => ({
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      mitraId: service.mitraId,
      mitraName: service.mitraName,
    }));
  }

  async calculateQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const serviceData = await this.db
      .select({
        service: schema.services,
        rate: schema.serviceRates,
      })
      .from(schema.services)
      .innerJoin(
        schema.serviceRates,
        eq(schema.services.id, schema.serviceRates.serviceId)
      )
      .where(
        and(
          eq(schema.services.id, request.serviceId),
          eq(schema.services.isPublic, true)
        )
      )
      .get();

    if (!serviceData) {
      throw new Error("Service not found or not public");
    }

    const distancePromises = [];
    for (let i = 0; i < request.stops.length - 1; i++) {
      const origin = {
        lat: request.stops[i].lat,
        lng: request.stops[i].lng,
      };
      const destination = {
        lat: request.stops[i + 1].lat,
        lng: request.stops[i + 1].lng,
      };
      distancePromises.push(getDistance(origin, destination));
    }

    const distances = await Promise.all(distancePromises);
    const totalDistanceKm = distances.reduce(
      (sum: number, dist: any) => sum + dist.distanceKm,
      0
    );

    const estimatedCost =
      serviceData.rate.baseFee + totalDistanceKm * serviceData.rate.feePerKm;

    return {
      estimatedCost,
      totalDistanceKm,
    };
  }

  async createOrder(
    request: OrderCreationRequest
  ): Promise<OrderCreationResponse> {
    const service = await this.db
      .select()
      .from(schema.services)
      .where(
        and(
          eq(schema.services.id, request.serviceId),
          eq(schema.services.isPublic, true)
        )
      )
      .get();

    if (!service) {
      throw new Error("Service not found or not public");
    }

    const quote = await this.calculateQuote({
      serviceId: request.serviceId,
      stops: request.stops,
    });

    const publicId = nanoid();

    // Validate stops before creating order to ensure atomicity

    const orderInsert = this.db
      .insert(schema.orders)
      .values({
        publicId,
        serviceId: service.id,
        ordererName: request.ordererName,
        ordererPhone: request.ordererPhone,
        recipientName: request.recipientName,
        recipientPhone: request.recipientPhone,
        notes: request.notes,
        estimatedCost: quote.estimatedCost,
        status: "pending_dispatch",
      })
      .returning({ id: schema.orders.id });

    const [orderResult] = await this.db.batch([orderInsert]);
    const orderId = orderResult[0].id;

    const stopInserts = request.stops.map((stop, index) =>
      this.db.insert(schema.orderStops).values({
        orderId,
        sequence: index + 1,
        type: stop.type,
        address: stop.address,
        lat: stop.lat,
        lng: stop.lng,
        status: "pending",
      })
    );

    const auditLogInsert = this.db.insert(schema.auditLogs).values({
      actorId: "SYSTEM_PUBLIC_API",
      targetEntity: "order",
      targetId: orderId,
      eventType: "ORDER_CREATED",
      payload: {
        publicId,
        serviceId: request.serviceId,
        stops: request.stops,
        ordererName: request.ordererName,
        ordererPhone: request.ordererPhone,
        recipientName: request.recipientName,
        recipientPhone: request.recipientPhone,
        notes: request.notes,
      },
    });

    console.log("AUDIT_LOG_INSERT:", auditLogInsert);

    await this.db.batch([...stopInserts]);

    // Create audit log separately to avoid transaction failure
    try {
      await this.db.insert(schema.auditLogs).values({
        actorId: "SYSTEM_PUBLIC_API",
        targetEntity: "order",
        targetId: orderId,
        eventType: "ORDER_CREATED",
        payload: {
          publicId,
          serviceId: request.serviceId,
          stops: request.stops,
          ordererName: request.ordererName,
          ordererPhone: request.ordererPhone,
          recipientName: request.recipientName,
          recipientPhone: request.recipientPhone,
          notes: request.notes,
        },
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Continue execution even if audit log fails
    }

    // Generate notification log for customer tracking
    let notificationLogId = "temp_notification_id";
    try {
      const notificationLog = await this.db
        .insert(schema.notificationLogs)
        .values({
          orderId: orderId,
          recipientPhone: request.ordererPhone,
          type: "TRACKING_LINK_FOR_CUSTOMER",
          status: "generated",
        })
        .returning({ id: schema.notificationLogs.id });

      notificationLogId = notificationLog[0].id;
    } catch (error) {
      console.error("Failed to create notification log:", error);
      // Use fallback ID
    }

    return {
      orderId: orderId
        .slice(0, 8)
        .split("")
        .reduce((a, b) => {
          a = (a << 5) - a + b.charCodeAt(0);
          return a & a;
        }, 0),
      publicId,
      trackingUrl: `https://treksistem.app/track/${publicId}`,
      notificationLogId: notificationLogId,
    };
  }

  async getOrderStatus(publicId: string): Promise<OrderTrackingResponse> {
    const order = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.publicId, publicId))
      .get();

    if (!order) {
      throw new Error("Order not found");
    }

    const stops = await this.db
      .select({
        sequence: schema.orderStops.sequence,
        type: schema.orderStops.type,
        address: schema.orderStops.address,
        status: schema.orderStops.status,
      })
      .from(schema.orderStops)
      .where(eq(schema.orderStops.orderId, order.id))
      .orderBy(schema.orderStops.sequence);

    const reports = await this.db
      .select({
        stage: schema.orderReports.stage,
        notes: schema.orderReports.notes,
        photoUrl: schema.orderReports.photoUrl,
        timestamp: schema.orderReports.timestamp,
      })
      .from(schema.orderReports)
      .where(eq(schema.orderReports.orderId, order.id))
      .orderBy(schema.orderReports.timestamp);

    return {
      publicId: order.publicId,
      status: order.status,
      estimatedCost: order.estimatedCost,
      stops: stops.map(stop => ({
        sequence: stop.sequence,
        type: stop.type,
        address: stop.address,
        status: stop.status,
      })),
      reports: reports.map(report => ({
        stage: report.stage,
        notes: report.notes || undefined,
        photoUrl: report.photoUrl || undefined,
        timestamp: report.timestamp?.toISOString() || new Date().toISOString(),
      })),
    };
  }
}
