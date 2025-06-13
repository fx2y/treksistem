import type { NotificationType } from "./types";

export const NotificationTemplates: Record<NotificationType, string> = {
  NEW_ORDER_FOR_DRIVER:
    "Order Baru #{orderPublicId} dari {mitraName}. Jemput di {pickupAddress}, Antar ke {destinationAddress}.",
  NEW_ORDER_AVAILABLE:
    "(Treksistem) Order Baru! #{{orderPublicId}} dari {{mitraName}}. Jemput: {{pickupAddress}}, Antar: {{destinationAddress}}. Klaim sekarang: https://driver.treksistem.app/orders/{{orderPublicId}}",
  TRACKING_LINK_FOR_CUSTOMER:
    "Pesanan Anda dari {mitraName} sedang dalam proses. Lacak pesanan: {trackingUrl}",
  ORDER_UPDATE_FOR_CUSTOMER:
    "Update pesanan Anda: {updateMessage} Lacak pesanan: {trackingUrl}",
};
