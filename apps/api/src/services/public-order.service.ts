import * as schema from "@treksistem/db";
import type { DbClient } from "@treksistem/db";
import { getDistance } from "@treksistem/geo";
import {
  NotificationService,
  type NotificationType,
} from "@treksistem/notifications";
import { and, eq } from "drizzle-orm";

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
    private db: DbClient,
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
      (sum: number, dist: { distanceKm: number }) => sum + dist.distanceKm,
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

    // Use transaction for atomic order creation
    const result = await this.db.transaction(async (tx) => {
      const [orderResult] = await tx
        .insert(schema.orders)
        .values({
          serviceId: service.id,
          ordererName: request.ordererName,
          ordererPhone: request.ordererPhone,
          recipientName: request.recipientName,
          recipientPhone: request.recipientPhone,
          notes: request.notes,
          estimatedCost: quote.estimatedCost,
          status: "pending_dispatch" as const,
        })
        .returning({ id: schema.orders.id, publicId: schema.orders.publicId });

      const { id: orderId, publicId } = orderResult;

      // Insert stops sequentially within transaction
      for (const [index, stop] of request.stops.entries()) {
        await tx.insert(schema.orderStops).values({
          orderId,
          sequence: index + 1,
          type: stop.type,
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
          status: "pending" as const,
        });
      }

      // Generate notification log within transaction
      const [notificationLog] = await tx
        .insert(schema.notificationLogs)
        .values({
          orderId: orderId,
          recipientPhone: request.ordererPhone,
          type: "TRACKING_LINK_FOR_CUSTOMER",
          status: "generated",
        })
        .returning({ id: schema.notificationLogs.id });

      return {
        orderId,
        publicId,
        notificationLogId: notificationLog.id,
      };
    });

    const { orderId, publicId, notificationLogId } = result;

    // Create audit log separately to avoid transaction failure
    try {
      await this.db.insert(schema.auditLogs).values({
        adminUserId: "SYSTEM_PUBLIC_API",
        targetEntity: "order",
        targetId: orderId,
        action: "ORDER_CREATED",
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

    // Broadcast NEW_ORDER_AVAILABLE notifications to all active drivers for this mitra
    try {
      const activeDrivers = await this.db
        .select({
          driverId: schema.drivers.id,
          userId: schema.drivers.userId,
          userPhone: schema.users.email, // Using email as phone placeholder
        })
        .from(schema.drivers)
        .innerJoin(schema.users, eq(schema.drivers.userId, schema.users.id))
        .where(
          and(
            eq(schema.drivers.mitraId, service.mitraId),
            eq(schema.drivers.status, "active")
          )
        );

      const mitra = await this.db
        .select({ businessName: schema.mitras.businessName })
        .from(schema.mitras)
        .where(eq(schema.mitras.id, service.mitraId))
        .get();

      const pickupStop = request.stops.find(stop => stop.type === "pickup");
      const dropoffStop = request.stops.find(stop => stop.type === "dropoff");

      for (const driver of activeDrivers) {
        try {
          await this.notificationService.generate(
            "NEW_ORDER_AVAILABLE" as NotificationType,
            {
              type: "NEW_ORDER_AVAILABLE",
              data: {
                recipientPhone: driver.userPhone,
                orderPublicId: publicId,
                mitraName: mitra?.businessName || "Unknown",
                pickupAddress: pickupStop?.address || "Unknown pickup",
                destinationAddress:
                  dropoffStop?.address || "Unknown destination",
              },
            } as const,
            {
              orderId: orderId,
            }
          );
        } catch (notificationError) {
          console.error(
            `Failed to notify driver ${driver.driverId}:`,
            notificationError
          );
        }
      }
    } catch (error) {
      console.error("Failed to broadcast order to drivers:", error);
      // Continue execution even if broadcast fails
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
    const order = await this.db.query.orders.findFirst({
      where: eq(schema.orders.publicId, publicId),
      with: {
        stops: {
          orderBy: (stops, { asc }) => [asc(stops.sequence)],
          columns: {
            sequence: true,
            type: true,
            address: true,
            status: true,
          },
        },
        reports: {
          orderBy: (reports, { asc }) => [asc(reports.timestamp)],
          columns: {
            stage: true,
            notes: true,
            photoUrl: true,
            timestamp: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return {
      publicId: order.publicId,
      status: order.status,
      estimatedCost: order.estimatedCost,
      stops: order.stops.map(stop => ({
        sequence: stop.sequence,
        type: stop.type,
        address: stop.address,
        status: stop.status,
      })),
      reports: order.reports.map(report => ({
        stage: report.stage,
        notes: report.notes || undefined,
        photoUrl: report.photoUrl || undefined,
        timestamp: report.timestamp?.toISOString() || new Date().toISOString(),
      })),
    };
  }
}
