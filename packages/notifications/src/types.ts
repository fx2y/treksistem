export type NotificationType =
  | "NEW_ORDER_FOR_DRIVER"
  | "TRACKING_LINK_FOR_CUSTOMER"
  | "ORDER_UPDATE_FOR_CUSTOMER";

export type NotificationPayload =
  | {
      type: "NEW_ORDER_FOR_DRIVER";
      recipientPhone: string;
      orderPublicId: string;
      mitraName: string;
      pickupAddress: string;
      destinationAddress: string;
    }
  | {
      type: "TRACKING_LINK_FOR_CUSTOMER";
      recipientPhone: string;
      trackingUrl: string;
      mitraName: string;
    }
  | {
      type: "ORDER_UPDATE_FOR_CUSTOMER";
      recipientPhone: string;
      trackingUrl: string;
      updateMessage: string;
    };
