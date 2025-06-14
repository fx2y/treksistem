import { invoices, mitras } from "@treksistem/db";
import type { DbClient } from "@treksistem/db";
import { eq, and, gte, lt } from "drizzle-orm";

import { NotFoundError, ForbiddenError } from "../lib/errors";
import { generateQRIS } from "../lib/qris";

export interface CreateInvoiceData {
  mitraId: string;
  type: "PLATFORM_SUBSCRIPTION" | "CUSTOMER_PAYMENT";
  amount: number;
  description?: string;
  dueDate?: Date;
}

export interface CustomerInvoiceDetails {
  amount: number;
  description: string;
  customerName: string;
}

export interface ListFilters {
  status?: "pending" | "paid" | "overdue" | "cancelled" | "all";
  limit?: number;
  offset?: number;
}

export interface ConfirmPaymentData {
  invoiceId: string;
  paymentDate: Date;
  notes?: string;
}

export class BillingService {
  constructor(private db: DbClient) {}

  async createInvoice(data: CreateInvoiceData) {
    const invoice = await this.db
      .insert(invoices)
      .values({
        mitraId: data.mitraId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        dueDate: data.dueDate,
        qrisPayload: generateQRIS({
          amount: data.amount,
          description: data.description || "Payment",
        }),
        createdAt: new Date(),
      })
      .returning();

    return invoice[0];
  }

  async getInvoicesByMitra(mitraId: string, status?: string, limit = 20) {
    const conditions = [eq(invoices.mitraId, mitraId)];

    if (status && status !== "all") {
      conditions.push(eq(invoices.status, status as "pending" | "paid" | "overdue" | "cancelled"));
    }

    return await this.db
      .select()
      .from(invoices)
      .where(and(...conditions))
      .limit(limit);
  }

  async getInvoiceByPublicId(publicId: string, mitraId?: string) {
    const conditions = [eq(invoices.publicId, publicId)];

    if (mitraId) {
      conditions.push(eq(invoices.mitraId, mitraId));
    }

    const result = await this.db
      .select()
      .from(invoices)
      .where(and(...conditions));

    return result[0];
  }

  async getPublicInvoiceDetails(publicInvoiceId: string) {
    const invoice = await this.getInvoiceByPublicId(publicInvoiceId);

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    if (invoice.type !== "CUSTOMER_PAYMENT") {
      throw new ForbiddenError("Invoice not accessible publicly");
    }

    const mitra = await this.db
      .select({ businessName: mitras.businessName })
      .from(mitras)
      .where(eq(mitras.id, invoice.mitraId))
      .limit(1);

    const businessName = mitra[0]?.businessName || "Treksistem Partner";

    return {
      businessName,
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      qrisPayload: invoice.qrisPayload,
      status: invoice.status,
      dueDate: invoice.dueDate,
    };
  }

  async confirmPayment({
    invoiceId,
    paymentDate,
    notes: _notes,
  }: ConfirmPaymentData) {
    const invoice = await this.getInvoiceByPublicId(invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.status === "paid") {
      throw new Error("Invoice already paid");
    }

    const updatedInvoice = await this.db
      .update(invoices)
      .set({
        status: "paid",
        paidAt: paymentDate,
      })
      .where(eq(invoices.publicId, invoiceId))
      .returning();

    if (invoice.type === "PLATFORM_SUBSCRIPTION") {
      await this.db
        .update(mitras)
        .set({ subscriptionStatus: "active" })
        .where(eq(mitras.id, invoice.mitraId));
    }

    return {
      invoice: updatedInvoice[0],
      mitraSubscriptionStatus: "active",
    };
  }

  async generateMonthlySubscriptionInvoices() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const eligibleMitras = await this.db
      .select()
      .from(mitras)
      .where(
        and(
          eq(mitras.subscriptionStatus, "active")
          // Add any other eligibility criteria
        )
      );

    const results = [];

    for (const mitra of eligibleMitras) {
      const existingInvoice = await this.db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.mitraId, mitra.id),
            eq(invoices.type, "PLATFORM_SUBSCRIPTION"),
            gte(invoices.createdAt, startOfMonth)
          )
        );

      if (existingInvoice.length === 0) {
        const amount = mitra.activeDriverLimit * 10000; // 10k IDR per driver
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(15); // Due on 15th of next month

        const invoice = await this.createInvoice({
          mitraId: mitra.id,
          type: "PLATFORM_SUBSCRIPTION",
          amount,
          description: `Subscription Fee: ${mitra.activeDriverLimit} drivers for ${new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}`,
          dueDate,
        });

        results.push(invoice);
      }
    }

    return results;
  }

  async handleOverdueSubscriptionInvoices() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const overdueInvoices = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.type, "PLATFORM_SUBSCRIPTION"),
          eq(invoices.status, "pending"),
          lt(invoices.dueDate, today)
        )
      );

    const results = [];

    for (const invoice of overdueInvoices) {
      await this.db
        .update(invoices)
        .set({ status: "overdue" })
        .where(eq(invoices.id, invoice.id));

      const mitra = await this.db
        .select()
        .from(mitras)
        .where(eq(mitras.id, invoice.mitraId));

      if (mitra[0] && mitra[0].subscriptionStatus !== "past_due") {
        await this.db
          .update(mitras)
          .set({ subscriptionStatus: "past_due" })
          .where(eq(mitras.id, invoice.mitraId));
      }

      results.push(invoice);
    }

    return results;
  }

  async createCustomerInvoice(
    mitraId: string,
    details: CustomerInvoiceDetails
  ) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days to pay

    return await this.createInvoice({
      mitraId,
      type: "CUSTOMER_PAYMENT",
      amount: details.amount,
      description: details.description,
      dueDate,
    });
  }

  async getInvoiceById(invoiceId: string) {
    const result = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.publicId, invoiceId));

    return result[0] || null;
  }

  async listInvoices(
    ownerId: string,
    ownerType: "mitra" | "admin",
    filters: ListFilters = {}
  ) {
    const { status = "all", limit = 20, offset = 0 } = filters;

    const conditions = [];

    if (ownerType === "mitra") {
      conditions.push(eq(invoices.mitraId, ownerId));
    }

    if (status && status !== "all") {
      conditions.push(eq(invoices.status, status));
    }

    return await this.db
      .select()
      .from(invoices)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset);
  }
}
