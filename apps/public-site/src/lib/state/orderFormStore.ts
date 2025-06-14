import { writable } from "svelte/store";

import type { StopInput, QuoteResponse } from "$lib/types";

export interface OrderFormState {
  serviceId: string;
  stops: StopInput[];
  ordererName: string;
  ordererPhone: string;
  recipientName: string;
  recipientPhone: string;
  notes: string;
  quote: QuoteResponse | null;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: OrderFormState = {
  serviceId: "",
  stops: [
    { address: "", lat: 0, lng: 0, type: "pickup" },
    { address: "", lat: 0, lng: 0, type: "dropoff" },
  ],
  ordererName: "",
  ordererPhone: "",
  recipientName: "",
  recipientPhone: "",
  notes: "",
  quote: null,
  isSubmitting: false,
  error: null,
};

export const orderFormStore = writable<OrderFormState>(initialState);

export function resetOrderForm() {
  orderFormStore.set({ ...initialState });
}

export function setServiceId(serviceId: string) {
  orderFormStore.update(state => ({
    ...state,
    serviceId,
  }));
}

export function addStop() {
  orderFormStore.update(state => ({
    ...state,
    stops: [...state.stops, { address: "", lat: 0, lng: 0, type: "dropoff" }],
  }));
}

export function removeStop(index: number) {
  orderFormStore.update(state => ({
    ...state,
    stops: state.stops.filter((_, i) => i !== index),
  }));
}

export function updateStop(index: number, stop: Partial<StopInput>) {
  orderFormStore.update(state => ({
    ...state,
    stops: state.stops.map((s, i) => (i === index ? { ...s, ...stop } : s)),
  }));
}

export function setQuote(quote: QuoteResponse | null) {
  orderFormStore.update(state => ({
    ...state,
    quote,
  }));
}

export function setSubmitting(isSubmitting: boolean) {
  orderFormStore.update(state => ({
    ...state,
    isSubmitting,
  }));
}

export function setError(error: string | null) {
  orderFormStore.update(state => ({
    ...state,
    error,
  }));
}
