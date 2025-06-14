import { BaseApiClient } from "@treksistem/api-client";

import { PUBLIC_API_URL } from "$lib/env";
import type {
  ServiceDiscoveryResponse,
  QuoteRequest,
  QuoteResponse,
  OrderCreationRequest,
  OrderCreationResponse,
  OrderTrackingResponse,
} from "$lib/types";

class PublicApiClient extends BaseApiClient {
  constructor() {
    super(PUBLIC_API_URL);
  }

  async findAvailableServices(
    lat: number,
    lng: number,
    payloadTypeId: string
  ): Promise<ServiceDiscoveryResponse[]> {
    return this.get<ServiceDiscoveryResponse[]>("/api/public/services", {
      lat: lat.toString(),
      lng: lng.toString(),
      payloadTypeId,
    });
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    return this.post<QuoteResponse>("/api/public/quote", request);
  }

  async createOrder(
    request: OrderCreationRequest
  ): Promise<OrderCreationResponse> {
    return this.post<OrderCreationResponse>("/api/public/orders", request);
  }

  async getOrderStatus(publicId: string): Promise<OrderTrackingResponse> {
    return this.get<OrderTrackingResponse>(`/api/public/track/${publicId}`);
  }

  async confirmNotificationTrigger(logId: string): Promise<void> {
    await this.post<void>(`/api/notifications/${logId}/triggered`);
  }
}

export const apiClient = new PublicApiClient();
