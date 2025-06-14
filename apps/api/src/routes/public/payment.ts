import { createDbClient, mitras } from "@treksistem/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

import { BillingService } from "../../services/billing.service";

type Bindings = {
  DB: D1Database;
};

const payment = new Hono<{ Bindings: Bindings }>();

payment.get("/:publicInvoiceId", async c => {
  try {
    const { publicInvoiceId } = c.req.param();
    const db = createDbClient(c.env.DB);
    const billingService = new BillingService(db);

    const invoice = await billingService.getInvoiceByPublicId(publicInvoiceId);

    if (!invoice) {
      return c.json({ error: "Invoice not found" }, 404);
    }

    if (invoice.type !== "CUSTOMER_PAYMENT") {
      return c.json({ error: "Invoice not accessible publicly" }, 403);
    }

    // Get mitra business name
    const mitra = await db
      .select()
      .from(mitras)
      .where(eq(mitras.id, invoice.mitraId))
      .limit(1);

    const businessName = mitra[0]?.businessName || "Treksistem Partner";

    return c.json({
      businessName,
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      qrisPayload: invoice.qrisPayload,
      status: invoice.status,
      dueDate: invoice.dueDate,
    });
  } catch (error) {
    console.error("Error fetching public invoice:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { payment };
