import { error } from "@sveltejs/kit";

import type { PageLoad } from "./$types";

import { apiClient } from "$lib/services/apiClient";

export const load: PageLoad = async ({ params }) => {
  try {
    const orderData = await apiClient.getOrderStatus(params.publicId);
    return {
      order: orderData,
    };
  } catch (err) {
    console.error("Failed to load order:", err);
    throw error(404, "Order not found");
  }
};
