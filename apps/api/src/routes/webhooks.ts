import crypto from "crypto";

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { BadRequestError, NotFoundError } from "../lib/errors";
import type { ServiceContainer } from "../services/factory";

const app = new Hono<{
  Bindings: {
    MIDTRANS_SERVER_KEY: string;
  };
  Variables: {
    services: ServiceContainer;
  };
}>();

// Midtrans webhook payload schema
const MidtransWebhookSchema = z.object({
  transaction_time: z.string(),
  transaction_status: z.enum([
    "capture",
    "settlement",
    "pending",
    "deny",
    "cancel",
    "expire",
    "failure",
    "refund",
    "partial_refund",
  ]),
  transaction_id: z.string(),
  status_message: z.string(),
  status_code: z.string(),
  signature_key: z.string(),
  settlement_time: z.string().optional(),
  payment_type: z.string(),
  order_id: z.string(),
  merchant_id: z.string(),
  gross_amount: z.string(),
  fraud_status: z.enum(["accept", "challenge", "deny"]).optional(),
  approval_code: z.string().optional(),
  currency: z.string().default("IDR"),
});

// Verify Midtrans signature
function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  signatureKey: string
): boolean {
  const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const hash = crypto.createHash("sha512").update(input).digest("hex");
  return hash === signatureKey;
}

// Map Midtrans status to our invoice status
function mapMidtransStatusToInvoiceStatus(
  transactionStatus: string,
  fraudStatus?: string
): "pending" | "paid" | "cancelled" {
  switch (transactionStatus) {
    case "capture":
    case "settlement":
      return fraudStatus === "accept" || !fraudStatus ? "paid" : "pending";
    case "pending":
      return "pending";
    case "deny":
    case "cancel":
    case "expire":
    case "failure":
      return "cancelled";
    default:
      return "pending";
  }
}

// Midtrans webhook handler
app.post("/midtrans", zValidator("json", MidtransWebhookSchema), async c => {
  const webhook = c.req.valid("json");
  const { billingService, webhookRetryService } = c.get("services");

  // Process webhook with retry mechanism
  return await webhookRetryService.processWithRetry(
    "midtrans",
    webhook,
    async () => {
      // Verify the webhook signature
      const serverKey = c.env.MIDTRANS_SERVER_KEY;
      if (!serverKey) {
        throw new BadRequestError("Midtrans server key not configured");
      }

      const isValidSignature = verifyMidtransSignature(
        webhook.order_id,
        webhook.status_code,
        webhook.gross_amount,
        serverKey,
        webhook.signature_key
      );

      if (!isValidSignature) {
        throw new BadRequestError("Invalid webhook signature");
      }

      // Extract invoice ID from order_id (assuming format: invoice_<publicId>)
      const publicInvoiceId = webhook.order_id.replace(/^invoice_/, "");

      // Get the invoice
      const invoice =
        await billingService.getInvoiceByPublicId(publicInvoiceId);
      if (!invoice) {
        throw new NotFoundError(`Invoice not found: ${publicInvoiceId}`);
      }

      // Map the Midtrans status to our invoice status
      const newStatus = mapMidtransStatusToInvoiceStatus(
        webhook.transaction_status,
        webhook.fraud_status
      );

      // Skip if status hasn't changed
      if (invoice.status === newStatus) {
        return c.json({ message: "Status unchanged" });
      }

      // Update invoice status based on webhook
      if (newStatus === "paid") {
        await billingService.confirmPayment({
          invoiceId: publicInvoiceId,
          paymentDate: new Date(
            webhook.settlement_time || webhook.transaction_time
          ),
          notes: `Paid via Midtrans: ${webhook.payment_type} (${webhook.transaction_id})`,
        });
      } else {
        // For other status changes, we would need to implement a method to update invoice status
        // For now, we'll skip non-payment status updates or implement this in the billing service
        console.log(
          `Invoice ${publicInvoiceId} status change to ${newStatus} - update method needed`
        );
      }

      // Log the webhook for audit purposes
      console.log(
        `Midtrans webhook processed: ${webhook.order_id} -> ${newStatus}`,
        {
          transactionId: webhook.transaction_id,
          paymentType: webhook.payment_type,
          amount: webhook.gross_amount,
          status: webhook.transaction_status,
        }
      );

      return c.json({
        message: "Webhook processed successfully",
        invoiceId: publicInvoiceId,
        newStatus,
      });
    }
  );
});

export default app;
