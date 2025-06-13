import { invoices, mitras } from "@treksistem/db";
import { eq, and, gte, lt } from "drizzle-orm";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { nanoid } from "nanoid";

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
  constructor(private db: DrizzleD1Database<any>) {}

  async createInvoice(data: CreateInvoiceData) {
    const invoice = await this.db
      .insert(invoices)
      .values({
        publicId: nanoid(),
        mitraId: data.mitraId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        dueDate: data.dueDate,
        qrisPayload: generateQRIS({
          amount: data.amount,
          invoiceId: nanoid(),
          description: data.description || "Payment",
        }),
        createdAt: new Date(),
      })
      .returning();

    return invoice[0];
  }

  async getInvoicesByMitra(mitraId: string, status?: string, limit = 20) {
    let query = this.db
      .select()
      .from(invoices)
      .where(eq(invoices.mitraId, mitraId))
      .limit(limit);

    if (status && status !== "all") {
      query = query.where(
        and(eq(invoices.mitraId, mitraId), eq(invoices.status, status as any))
      );
    }

    return await query;
  }

  async getInvoiceByPublicId(publicId: string, mitraId?: string) {
    let whereClause = eq(invoices.publicId, publicId);

    if (mitraId) {
      whereClause = and(
        eq(invoices.publicId, publicId),
        eq(invoices.mitraId, mitraId)
      );
    }

    const result = await this.db.select().from(invoices).where(whereClause);

    return result[0];
  }

  async confirmPayment({ invoiceId, paymentDate, _notes }: ConfirmPaymentData) {
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

    let query = this.db.select().from(invoices).limit(limit).offset(offset);

    if (ownerType === "mitra") {
      query = query.where(eq(invoices.mitraId, ownerId));
    }

    if (status && status !== "all") {
      const currentWhere =
        ownerType === "mitra" ? eq(invoices.mitraId, ownerId) : undefined;
      const statusWhere = eq(invoices.status, status);
      query = query.where(
        currentWhere ? and(currentWhere, statusWhere) : statusWhere
      );
    }

    return await query;
  }
}
