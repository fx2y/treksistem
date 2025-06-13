import { orders, orderReports, drivers, users, vehicles, services } from "@treksistem/db";
import { eq, and, gte, lt, desc } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export interface LogbookEntry {
  timestamp: string;
  event: string;
  address: string;
  driverName: string;
  vehicleLicensePlate: string;
  orderPublicId: string;
}

export interface LogbookQuery {
  vehicleId?: string;
  driverId?: string;
  date?: string;
}

export class LogbookService {
  constructor(private db: DrizzleD1Database) {}

  async getLogbook(mitraId: string, query: LogbookQuery): Promise<LogbookEntry[]> {
    // Build query conditions
    const conditions = [
      eq(services.mitraId, mitraId)
    ];

    // Add vehicle filter if provided
    if (query.vehicleId) {
      conditions.push(eq(orders.assignedVehicleId, query.vehicleId));
    }

    // Add driver filter if provided  
    if (query.driverId) {
      conditions.push(eq(orders.assignedDriverId, query.driverId));
    }

    // Add date filter if provided (full 24-hour period UTC)
    if (query.date) {
      const startDate = new Date(`${query.date}T00:00:00.000Z`);
      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      
      conditions.push(
        gte(orderReports.timestamp, startDate),
        lt(orderReports.timestamp, endDate)
      );
    }

    // Execute complex join query using order reports table for timestamps
    const results = await this.db
      .select({
        timestamp: orderReports.timestamp,
        stage: orderReports.stage,
        notes: orderReports.notes,
        driverName: users.name,
        vehicleLicensePlate: vehicles.licensePlate,
        orderPublicId: orders.publicId,
      })
      .from(orderReports)
      .innerJoin(orders, eq(orderReports.orderId, orders.id))
      .innerJoin(services, eq(orders.serviceId, services.id))
      .innerJoin(drivers, eq(orderReports.driverId, drivers.id))
      .innerJoin(users, eq(drivers.userId, users.id))
      .leftJoin(vehicles, eq(orders.assignedVehicleId, vehicles.id))
      .where(and(...conditions))
      .orderBy(desc(orderReports.timestamp));

    // Transform results into LogbookEntry format
    return results.map(row => ({
      timestamp: row.timestamp?.toISOString() || '',
      event: row.stage === 'pickup' ? 'Pickup reported' : 
             row.stage === 'dropoff' ? 'Drop-off reported' : 
             'Transit update reported',
      address: row.notes || 'No location details',
      driverName: row.driverName || 'Unknown Driver',
      vehicleLicensePlate: row.vehicleLicensePlate || 'Unknown Vehicle',
      orderPublicId: row.orderPublicId,
    }));
  }
}