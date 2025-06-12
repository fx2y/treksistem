// Push notification utilities
export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(notification: PushNotification) {
  // TODO: Implement push notification sending
  console.log("Sending notification:", notification);
}
