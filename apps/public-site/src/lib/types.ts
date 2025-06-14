export interface StopInput {
  address: string;
  lat: number;
  lng: number;
  type: "pickup" | "dropoff";
}

export interface QuoteRequest {
  serviceId: string;
  stops: StopInput[];
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

export interface ServiceDiscoveryResponse {
  serviceId: string;
  serviceName: string;
  mitraId: string;
  mitraName: string;
}

export interface QuoteResponse {
  estimatedCost: number;
  totalDistanceKm: number;
}

export interface OrderCreationResponse {
  orderId: string;
  publicId: string;
  trackingUrl: string;
  notificationLogId: string;
}

export interface OrderTrackingResponse {
  publicId: string;
  status: string;
  estimatedCost: number;
  stops: StopInput[];
  reports: {
    stage: string;
    notes?: string;
    photoUrl?: string;
    timestamp: string;
  }[];
}
