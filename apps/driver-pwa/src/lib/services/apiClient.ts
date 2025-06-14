import { BaseApiClient } from "@treksistem/api-client";

export interface DriverOrder {
  id: string;
  publicId: string;
  status: string;
  ordererName: string;
  recipientName: string;
  stops: Array<{
    id: string;
    address: string;
    lat: number;
    lng: number;
    type: "pickup" | "dropoff";
    sequence: number;
    status: string;
  }>;
  estimatedCost: number;
  createdAt: string;
}

export interface LocationUpdate {
  lat: number;
  lng: number;
}

export interface OrderReport {
  stage: string;
  notes?: string;
  photoUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  driverForMitras?: Array<{
    id: string;
    businessName: string;
  }>;
}

class DriverApiClient extends BaseApiClient {
  constructor() {
    const baseURL =
      typeof window !== "undefined"
        ? window.location.origin + "/api"
        : "http://localhost:8787/api";
    super(baseURL);
  }

  async getMe(): Promise<User> {
    return this.get("/auth/me");
  }

  async getOrders(mitraId?: string): Promise<DriverOrder[]> {
    const params = mitraId ? { mitraId } : undefined;
    return this.get("/driver/orders", params);
  }

  async claimOrder(orderId: string): Promise<void> {
    return this.post(`/driver/orders/${orderId}/claim`);
  }

  async updateLocation(location: LocationUpdate): Promise<void> {
    return this.post("/driver/location", location);
  }

  async submitReport(orderId: string, report: OrderReport): Promise<void> {
    return this.post(`/driver/orders/${orderId}/report`, report);
  }

  async requestUploadUrl(
    fileName: string,
    contentType: string
  ): Promise<{
    signedUrl: string;
    publicUrl: string;
  }> {
    return this.post("/uploads/request-url", { fileName, contentType });
  }
}

export const apiClient = new DriverApiClient();
