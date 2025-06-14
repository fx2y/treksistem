import { PUBLIC_API_URL } from "$lib/env";
import type {
  ServiceDiscoveryResponse,
  QuoteRequest,
  QuoteResponse,
  OrderCreationRequest,
  OrderCreationResponse,
  OrderTrackingResponse,
} from "$lib/types";

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = PUBLIC_API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const searchParams = params ? new URLSearchParams(params).toString() : "";
    const url = searchParams ? `${endpoint}?${searchParams}` : endpoint;
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
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

export const apiClient = new ApiClient();
