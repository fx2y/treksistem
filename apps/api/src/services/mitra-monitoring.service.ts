import { orders, services } from "@treksistem/db";
import type { DbClient } from "@treksistem/db";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";

const MAX_LIMIT = 100;

export interface ValidatedGetMitraOrdersQuery {
  status?:
    | "pending_dispatch"
    | "accepted"
    | "pickup"
    | "in_transit"
    | "delivered"
    | "cancelled"
    | "claimed";
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export interface OrderSummaryDTO {
  orderId: string;
  publicId: string;
  status:
    | "pending_dispatch"
    | "accepted"
    | "pickup"
    | "in_transit"
    | "delivered"
    | "cancelled"
    | "claimed";
  createdAt: string;
  estimatedCost: number;
  recipientName: string;
  driverName: string | null;
  stops: Array<{
    sequence: number;
    type: "pickup" | "dropoff";
    address: string;
    status: "pending" | "completed";
  }>;
}

export interface GetMitraOrdersResponse {
  data: OrderSummaryDTO[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

export class MitraMonitoringService {
  constructor(private db: DbClient) {}

  async getOrders(
    mitraId: string,
    query: ValidatedGetMitraOrdersQuery
  ): Promise<GetMitraOrdersResponse> {
    const safeLimit = Math.min(query.limit, MAX_LIMIT);
    const offset = (query.page - 1) * safeLimit;

    // Build where conditions for orders
    const orderWhereConditions = [];

    if (query.status) {
      orderWhereConditions.push(eq(orders.status, query.status));
    }

    if (query.startDate) {
      orderWhereConditions.push(
        gte(orders.createdAt, new Date(query.startDate))
      );
    }

    if (query.endDate) {
      orderWhereConditions.push(lte(orders.createdAt, new Date(query.endDate)));
    }

    // Get total count for pagination
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(orders)
      .innerJoin(services, eq(orders.serviceId, services.id))
      .where(and(eq(services.mitraId, mitraId), ...orderWhereConditions));

    const totalItems = totalResult.count;
    const totalPages = Math.ceil(totalItems / safeLimit);

    // Get paginated orders with basic joins
    const orderResults = await this.db
      .select({
        id: orders.id,
        publicId: orders.publicId,
        status: orders.status,
        createdAt: orders.createdAt,
        estimatedCost: orders.estimatedCost,
        recipientName: orders.recipientName,
        serviceId: orders.serviceId,
        assignedDriverId: orders.assignedDriverId,
      })
      .from(orders)
      .innerJoin(services, eq(orders.serviceId, services.id))
      .where(and(eq(services.mitraId, mitraId), ...orderWhereConditions))
      .orderBy(desc(orders.createdAt))
      .limit(safeLimit)
      .offset(offset);

    // Transform to DTOs
    const data: OrderSummaryDTO[] = orderResults.map(order => ({
      orderId: order.id,
      publicId: order.publicId,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      estimatedCost: order.estimatedCost,
      recipientName: order.recipientName,
      driverName: null, // Will be filled later if needed
      stops: [], // Will be filled later if needed
    }));

    return {
      data,
      meta: {
        totalItems,
        totalPages,
        currentPage: query.page,
        itemsPerPage: safeLimit,
      },
    };
  }

  // Legacy method with simplified implementation
  async getOrdersForMitra_LEGACY(mitraId: string) {
    return await this.db
      .select()
      .from(orders)
      .innerJoin(services, eq(orders.serviceId, services.id))
      .where(eq(services.mitraId, mitraId))
      .orderBy(desc(orders.createdAt));
  }
}
