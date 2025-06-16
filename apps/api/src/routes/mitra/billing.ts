import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { BillingService } from "../../services/billing.service";

const app = new Hono<{
  Variables: {
    mitraId: string;
    services: any;
  };
}>();

const querySchema = z.object({
  status: z.enum(["pending", "paid", "all"]).optional().default("all"),
  limit: z.string().transform(Number).optional().default("20"),
});

app.get("/invoices", zValidator("query", querySchema), async c => {
  const { status, limit } = c.req.valid("query");
  const mitraId = c.get("mitraId");
  const { db } = c.get("services");

  try {
    const billingService = new BillingService(db);
    const invoices = await billingService.getInvoicesByMitra(
      mitraId,
      status,
      limit
    );

    const convertTimestamp = (timestamp: any): string | null => {
      if (!timestamp || timestamp === null || timestamp === undefined)
        return null;
      try {
        if (timestamp instanceof Date) {
          return timestamp.toISOString();
        }
        if (typeof timestamp === "number") {
          return new Date(timestamp * 1000).toISOString();
        }
        if (typeof timestamp === "string") {
          return new Date(timestamp).toISOString();
        }
      } catch (e) {
        console.error("Timestamp conversion error:", e, timestamp);
      }
      return null;
    };

    return c.json({
      invoices: invoices.map(invoice => ({
        invoiceId: invoice.publicId,
        type: invoice.type,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        dueDate: convertTimestamp(invoice.dueDate),
        createdAt: convertTimestamp(invoice.createdAt),
      })),
    });
  } catch (error: any) {
    console.error("Mitra billing error:", error);
    return c.json({ error: error.message || "Failed to fetch invoices" }, 500);
  }
});

app.get("/invoices/:invoiceId", async c => {
  const invoiceId = c.req.param("invoiceId");
  const mitraId = c.get("mitraId");
  const { db } = c.get("services");

  const billingService = new BillingService(db);
  const invoice = await billingService.getInvoiceByPublicId(invoiceId, mitraId);

  if (!invoice) {
    return c.json({ error: "Invoice not found" }, 404);
  }

  return c.json({
    invoiceId: invoice.publicId,
    type: invoice.type,
    status: invoice.status,
    amount: invoice.amount,
    currency: invoice.currency,
    description: invoice.description,
    dueDate: invoice.dueDate?.toISOString(),
    qrisPayload: invoice.qrisPayload,
  });
});

app.get("/subscription-status", async c => {
  const mitraId = c.get("mitraId");
  const { db } = c.get("services");

  const billingService = new BillingService(db);
  const status = await billingService.getSubscriptionStatus(mitraId);

  return c.json(status);
});

export default app;
