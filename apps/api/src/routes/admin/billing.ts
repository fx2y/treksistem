import { zValidator } from "@hono/zod-validator";
import { invoices } from "@treksistem/db";
import { Hono } from "hono";
import { z } from "zod";

import { BillingService } from "../../services/billing.service";

const app = new Hono<{
  Variables: {
    services: any;
    adminUserId: string;
  };
}>();

const confirmPaymentSchema = z.object({
  paymentDate: z.string().transform(date => new Date(date)),
  notes: z.string().optional(),
});

const listInvoicesSchema = z.object({
  status: z
    .enum(["pending", "paid", "overdue", "cancelled", "all"])
    .optional()
    .default("all"),
  limit: z.string().transform(Number).optional().default("20"),
  offset: z.string().transform(Number).optional().default("0"),
});

app.get("/debug", async c => {
  const { db } = c.get("services");

  try {
    const rawInvoices = await db.select().from(invoices).limit(1);
    return c.json({
      debug: true,
      count: rawInvoices.length,
      invoice: rawInvoices[0] || null,
      types: rawInvoices[0]
        ? {
            dueDate: typeof rawInvoices[0].dueDate,
            createdAt: typeof rawInvoices[0].createdAt,
            dueDateValue: rawInvoices[0].dueDate,
            createdAtValue: rawInvoices[0].createdAt,
          }
        : null,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/invoices", zValidator("query", listInvoicesSchema), async c => {
  const { status, limit, offset } = c.req.valid("query");
  const { db } = c.get("services");

  try {
    const billingService = new BillingService(db);
    const invoices = await billingService.listInvoices("admin", "admin", {
      status,
      limit,
      offset,
    });

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
        mitraId: invoice.mitraId,
        type: invoice.type,
        status: invoice.status,
        amount: invoice.amount,
        currency: invoice.currency,
        description: invoice.description,
        dueDate: convertTimestamp(invoice.dueDate),
        paidAt: convertTimestamp(invoice.paidAt),
        createdAt: convertTimestamp(invoice.createdAt),
      })),
    });
  } catch (error: any) {
    console.error("Admin billing error:", error);
    return c.json({ error: error.message || "Failed to fetch invoices" }, 500);
  }
});

app.post(
  "/invoices/:invoiceId/confirm-payment",
  zValidator("json", confirmPaymentSchema),
  async c => {
    const invoiceId = c.req.param("invoiceId");
    const { paymentDate, notes } = c.req.valid("json");
    const { db } = c.get("services");

    try {
      const billingService = new BillingService(db);
      const result = await billingService.confirmPayment({
        invoiceId,
        paymentDate,
        notes,
      });

      return c.json({
        invoiceId: result.invoice.publicId,
        status: result.invoice.status,
        mitraSubscriptionStatus: result.mitraSubscriptionStatus,
      });
    } catch (error: any) {
      if (error.message === "Invoice not found") {
        return c.json({ error: "Invoice not found" }, 404);
      }
      if (error.message === "Invoice already paid") {
        return c.json({ error: "Invoice already paid" }, 409);
      }
      throw error;
    }
  }
);

export default app;
