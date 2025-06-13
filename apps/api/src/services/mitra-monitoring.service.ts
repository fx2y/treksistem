import { orders, services } from "@treksistem/db";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/d1";

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
  constructor(private db: ReturnType<typeof drizzle>) {}

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

    // Get paginated orders with related data using relational query
    const orderResults = await this.db.query.orders.findMany({
      where:
        orderWhereConditions.length > 0
          ? and(...orderWhereConditions)
          : undefined,
      with: {
        service: {
          where: eq(services.mitraId, mitraId),
        },
        assignedDriver: {
          with: {
            user: true,
          },
        },
        stops: {
          orderBy: (stops, { asc }) => [asc(stops.sequence)],
        },
      },
      orderBy: [desc(orders.createdAt)],
      limit: safeLimit,
      offset: offset,
    });

    // Filter out orders that don't belong to this mitra (additional safety check)
    const filteredOrders = orderResults.filter(
      order => order.service?.mitraId === mitraId
    );

    // Transform to DTOs
    const data: OrderSummaryDTO[] = filteredOrders.map(order => ({
      orderId: order.id,
      publicId: order.publicId,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      estimatedCost: order.estimatedCost,
      recipientName: order.recipientName,
      driverName: order.assignedDriver?.user?.name || null,
      stops: order.stops.map(stop => ({
        sequence: stop.sequence,
        type: stop.type,
        address: stop.address,
        status: stop.status,
      })),
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
}
