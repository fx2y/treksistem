import { describe, it, expect, beforeEach, vi } from "vitest";
import { PublicOrderService } from "./public-order.service";
import { AuditService } from "./audit.service";
import { NotFoundError } from "../lib/errors";

// Mock the geo package
vi.mock("@treksistem/geo", () => ({
  getDistance: vi.fn(() => ({ distanceKm: 5.0 })),
}));

describe("PublicOrderService", () => {
  let publicOrderService: PublicOrderService;
  let mockDb: any;
  let mockNotificationService: any;
  let mockAuditService: AuditService;

  beforeEach(() => {
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn(),
      transaction: vi.fn(),
      query: {
        orders: {
          findFirst: vi.fn(),
        },
      },
    };

    mockNotificationService = {
      generate: vi.fn(),
    };

    mockAuditService = {
      log: vi.fn(),
    } as any;

    publicOrderService = new PublicOrderService(
      mockDb,
      mockNotificationService,
      mockAuditService
    );
  });

  describe("findAvailableServices", () => {
    it("should return available services for given payload type", async () => {
      const mockServices = [
        {
          serviceId: "service_1",
          serviceName: "Food Delivery",
          mitraId: "mitra_1",
          mitraName: "Mitra Business 1",
        },
        {
          serviceId: "service_2",
          serviceName: "Package Delivery",
          mitraId: "mitra_2",
          mitraName: "Mitra Business 2",
        },
      ];

      mockDb.where.mockResolvedValue(mockServices);

      const result = await publicOrderService.findAvailableServices({
        lat: -7.98,
        lng: 112.6,
        payloadTypeId: "payload_1",
      });

      expect(result).toEqual([
        {
          serviceId: "service_1",
          serviceName: "Food Delivery",
          mitraId: "mitra_1",
          mitraName: "Mitra Business 1",
        },
        {
          serviceId: "service_2",
          serviceName: "Package Delivery",
          mitraId: "mitra_2",
          mitraName: "Mitra Business 2",
        },
      ]);

      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockDb.innerJoin).toHaveBeenCalledTimes(2);
    });

    it("should return empty array when no services available", async () => {
      mockDb.where.mockResolvedValue([]);

      const result = await publicOrderService.findAvailableServices({
        lat: -7.98,
        lng: 112.6,
        payloadTypeId: "payload_1",
      });

      expect(result).toEqual([]);
    });
  });

  describe("calculateQuote", () => {
    it("should calculate quote based on distance and service rates", async () => {
      const mockServiceData = {
        service: { id: "service_1", isPublic: true },
        rate: { baseFee: 5000, feePerKm: 2000 },
      };

      mockDb.get.mockResolvedValue(mockServiceData);

      const request = {
        serviceId: "service_1",
        stops: [
          { address: "Point A", lat: -7.98, lng: 112.6, type: "pickup" },
          { address: "Point B", lat: -7.99, lng: 112.7, type: "dropoff" },
        ],
      };

      const result = await publicOrderService.calculateQuote(request);

      expect(result).toEqual({
        estimatedCost: 15000, // 5000 + (5.0 * 2000)
        totalDistanceKm: 5.0,
      });
    });

    it("should throw NotFoundError when service not found", async () => {
      mockDb.get.mockResolvedValue(null);

      const request = {
        serviceId: "nonexistent",
        stops: [
          { address: "Point A", lat: -7.98, lng: 112.6, type: "pickup" },
          { address: "Point B", lat: -7.99, lng: 112.7, type: "dropoff" },
        ],
      };

      await expect(publicOrderService.calculateQuote(request)).rejects.toThrow(
        NotFoundError
      );
      await expect(publicOrderService.calculateQuote(request)).rejects.toThrow(
        "Service not found or not public"
      );
    });

    it("should calculate quote for multiple stops", async () => {
      const mockServiceData = {
        service: { id: "service_1", isPublic: true },
        rate: { baseFee: 5000, feePerKm: 2000 },
      };

      mockDb.get.mockResolvedValue(mockServiceData);

      const request = {
        serviceId: "service_1",
        stops: [
          { address: "Point A", lat: -7.98, lng: 112.6, type: "pickup" },
          { address: "Point B", lat: -7.99, lng: 112.7, type: "dropoff" },
          { address: "Point C", lat: -8.0, lng: 112.8, type: "dropoff" },
        ],
      };

      const result = await publicOrderService.calculateQuote(request);

      expect(result).toEqual({
        estimatedCost: 25000, // 5000 + (10.0 * 2000) - two segments of 5km each
        totalDistanceKm: 10.0,
      });
    });
  });

  describe("createOrder", () => {
    const validRequest = {
      serviceId: "service_1",
      stops: [
        { address: "Pickup Point", lat: -7.98, lng: 112.6, type: "pickup" as const },
        { address: "Dropoff Point", lat: -7.99, lng: 112.7, type: "dropoff" as const },
      ],
      ordererName: "John Doe",
      ordererPhone: "081234567890",
      recipientName: "Jane Doe",
      recipientPhone: "089876543210",
      notes: "Handle with care",
    };

    it("should create order successfully", async () => {
      const mockService = {
        id: "service_1",
        mitraId: "mitra_1",
        isPublic: true,
      };

      const mockOrderResult = {
        id: "order_123",
        publicId: "pub_order_123",
      };

      const mockNotificationLog = {
        id: "notif_123",
      };

      mockDb.get.mockResolvedValueOnce(mockService);
      
      // Mock calculateQuote
      vi.spyOn(publicOrderService, "calculateQuote").mockResolvedValue({
        estimatedCost: 15000,
        totalDistanceKm: 5.0,
      });

      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn()
            .mockResolvedValueOnce([mockOrderResult])
            .mockResolvedValueOnce([mockNotificationLog]),
        };

        return await callback(mockTx);
      });

      // Mock driver broadcast queries
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            driverId: "driver_1",
            userId: "user_1",
            userPhone: "driver1@example.com",
          },
        ]),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ businessName: "Test Mitra" }),
      });

      const result = await publicOrderService.createOrder(validRequest);

      expect(result).toEqual({
        orderId: expect.any(Number),
        publicId: "pub_order_123",
        trackingUrl: "https://treksistem.app/track/pub_order_123",
        notificationLogId: "notif_123",
      });

      expect(mockAuditService.log).toHaveBeenCalledWith({
        actorId: "SYSTEM_PUBLIC_API",
        entityType: "ORDER",
        entityId: "order_123",
        eventType: "ORDER_CREATED",
        details: {
          publicId: "pub_order_123",
          serviceId: "service_1",
          stops: validRequest.stops,
          ordererName: "John Doe",
          ordererPhone: "081234567890",
          recipientName: "Jane Doe",
          recipientPhone: "089876543210",
          notes: "Handle with care",
        },
      });

      expect(mockNotificationService.generate).toHaveBeenCalledWith(
        "NEW_ORDER_AVAILABLE",
        {
          type: "NEW_ORDER_AVAILABLE",
          data: {
            recipientPhone: "driver1@example.com",
            orderPublicId: "pub_order_123",
            mitraName: "Test Mitra",
            pickupAddress: "Pickup Point",
            destinationAddress: "Dropoff Point",
          },
        },
        {
          orderId: "order_123",
        }
      );
    });

    it("should throw NotFoundError when service not found", async () => {
      mockDb.get.mockResolvedValue(null);

      await expect(publicOrderService.createOrder(validRequest)).rejects.toThrow(
        NotFoundError
      );
      await expect(publicOrderService.createOrder(validRequest)).rejects.toThrow(
        "Service not found or not public"
      );
    });

    it("should work without audit service", async () => {
      const serviceWithoutAudit = new PublicOrderService(
        mockDb,
        mockNotificationService
      );

      const mockService = {
        id: "service_1",
        mitraId: "mitra_1",
        isPublic: true,
      };

      const mockOrderResult = {
        id: "order_123",
        publicId: "pub_order_123",
      };

      const mockNotificationLog = {
        id: "notif_123",
      };

      mockDb.get.mockResolvedValueOnce(mockService);
      
      vi.spyOn(serviceWithoutAudit, "calculateQuote").mockResolvedValue({
        estimatedCost: 15000,
        totalDistanceKm: 5.0,
      });

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn()
            .mockResolvedValueOnce([mockOrderResult])
            .mockResolvedValueOnce([mockNotificationLog]),
        };

        return await callback(mockTx);
      });

      // Mock driver queries returning empty arrays to avoid broadcast
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });

      const result = await serviceWithoutAudit.createOrder(validRequest);

      expect(result.publicId).toBe("pub_order_123");
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });

  describe("getOrderStatus", () => {
    it("should return order status with stops and reports", async () => {
      const mockOrder = {
        publicId: "pub_order_123",
        status: "in_transit",
        estimatedCost: 15000,
        stops: [
          {
            sequence: 1,
            type: "pickup",
            address: "Pickup Point",
            status: "completed",
          },
          {
            sequence: 2,
            type: "dropoff",
            address: "Dropoff Point",
            status: "pending",
          },
        ],
        reports: [
          {
            stage: "pickup",
            notes: "Package collected",
            photoUrl: "https://example.com/photo1.jpg",
            timestamp: new Date("2023-01-01T10:00:00Z"),
          },
        ],
      };

      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);

      const result = await publicOrderService.getOrderStatus("pub_order_123");

      expect(result).toEqual({
        publicId: "pub_order_123",
        status: "in_transit",
        estimatedCost: 15000,
        stops: [
          {
            sequence: 1,
            type: "pickup",
            address: "Pickup Point",
            status: "completed",
          },
          {
            sequence: 2,
            type: "dropoff",
            address: "Dropoff Point",
            status: "pending",
          },
        ],
        reports: [
          {
            stage: "pickup",
            notes: "Package collected",
            photoUrl: "https://example.com/photo1.jpg",
            timestamp: "2023-01-01T10:00:00.000Z",
          },
        ],
      });
    });

    it("should throw NotFoundError when order not found", async () => {
      mockDb.query.orders.findFirst.mockResolvedValue(null);

      await expect(
        publicOrderService.getOrderStatus("nonexistent")
      ).rejects.toThrow(NotFoundError);
      await expect(
        publicOrderService.getOrderStatus("nonexistent")
      ).rejects.toThrow("Order not found");
    });

    it("should handle orders with no reports", async () => {
      const mockOrder = {
        publicId: "pub_order_123",
        status: "pending_dispatch",
        estimatedCost: 15000,
        stops: [
          {
            sequence: 1,
            type: "pickup",
            address: "Pickup Point",
            status: "pending",
          },
        ],
        reports: [],
      };

      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);

      const result = await publicOrderService.getOrderStatus("pub_order_123");

      expect(result.reports).toEqual([]);
    });

    it("should handle reports with null timestamp", async () => {
      const mockOrder = {
        publicId: "pub_order_123",
        status: "in_transit",
        estimatedCost: 15000,
        stops: [],
        reports: [
          {
            stage: "pickup",
            notes: null,
            photoUrl: null,
            timestamp: null,
          },
        ],
      };

      mockDb.query.orders.findFirst.mockResolvedValue(mockOrder);

      const result = await publicOrderService.getOrderStatus("pub_order_123");

      expect(result.reports[0]).toEqual({
        stage: "pickup",
        notes: undefined,
        photoUrl: undefined,
        timestamp: expect.any(String),
      });
    });
  });
});