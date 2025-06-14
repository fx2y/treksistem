import { api } from "@treksistem/api-client";
import { writable } from "svelte/store";

interface Order {
  id: string;
  publicId: string;
  ordererName: string;
  ordererPhone: string;
  recipientName: string;
  recipientPhone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderStops: Array<{
    id: string;
    address: string;
    lat: number;
    lng: number;
    type: "pickup" | "dropoff";
    sequence: number;
    status: string;
  }>;
}

interface OrderState {
  availableOrders: Order[];
  myOrders: Order[];
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  availableOrders: [],
  myOrders: [],
  loading: false,
  error: null,
};

export const orderStore = writable<OrderState>(initialState);

export const orderActions = {
  async fetchAvailableOrders(): Promise<void> {
    orderStore.update(state => ({ ...state, loading: true, error: null }));

    try {
      const response = await api.driver.orders.available.get();
      orderStore.update(state => ({
        ...state,
        availableOrders: response.data || [],
        loading: false,
      }));
    } catch (error) {
      orderStore.update(state => ({
        ...state,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch available orders",
        loading: false,
      }));
    }
  },

  async fetchMyOrders(): Promise<void> {
    orderStore.update(state => ({ ...state, loading: true, error: null }));

    try {
      const response = await api.driver.orders.get();
      orderStore.update(state => ({
        ...state,
        myOrders: response.data || [],
        loading: false,
      }));
    } catch (error) {
      orderStore.update(state => ({
        ...state,
        error:
          error instanceof Error ? error.message : "Failed to fetch my orders",
        loading: false,
      }));
    }
  },

  async claimOrder(orderId: string): Promise<boolean> {
    try {
      await api.driver.orders[":id"].claim.post({ param: { id: orderId } });

      // Refresh both lists after claiming
      await Promise.all([
        orderActions.fetchAvailableOrders(),
        orderActions.fetchMyOrders(),
      ]);

      return true;
    } catch (error) {
      orderStore.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : "Failed to claim order",
      }));
      return false;
    }
  },

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      await api.driver.orders[":id"].status.post({
        param: { id: orderId },
        json: { status },
      });

      // Refresh my orders after status update
      await orderActions.fetchMyOrders();
      return true;
    } catch (error) {
      orderStore.update(state => ({
        ...state,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update order status",
      }));
      return false;
    }
  },

  clearError(): void {
    orderStore.update(state => ({ ...state, error: null }));
  },
};
