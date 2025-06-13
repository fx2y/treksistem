export type NotificationType =
  | "NEW_ORDER_FOR_DRIVER"
  | "NEW_ORDER_AVAILABLE"
  | "TRACKING_LINK_FOR_CUSTOMER"
  | "ORDER_UPDATE_FOR_CUSTOMER";

export type NotificationPayload =
  | {
      type: "NEW_ORDER_FOR_DRIVER";
      data: {
        recipientPhone: string;
        orderId: string;
        pickupAddress: string;
      };
    }
  | {
      type: "NEW_ORDER_AVAILABLE";
      data: {
        recipientPhone: string;
        orderPublicId: string;
        mitraName: string;
        pickupAddress: string;
        destinationAddress: string;
      };
    }
  | {
      type: "TRACKING_LINK_FOR_CUSTOMER";
      data: {
        recipientPhone: string;
        trackingUrl: string;
        mitraName: string;
      };
    }
  | {
      type: "ORDER_UPDATE_FOR_CUSTOMER";
      data: {
        recipientPhone: string;
        orderId: string;
        newStatus: string;
      };
    };

export interface FormattedNotification {
  recipientPhone: string; // E.164 format
  message: string; // Rendered message
  waLink: string; // URL-encoded wa.me link
}

export interface NotificationServiceOptions {
  language?: string;
  orderId?: string;
}
