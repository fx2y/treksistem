import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, gte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { invoices, mitras } from '@treksistem/db';
import { generateQRIS } from '../lib/qris';

export interface CreateInvoiceData {
  mitraId: string;
  type: 'subscription' | 'delivery_fee' | 'other';
  amount: number;
  description?: string;
  dueDate?: Date;
}

export interface ConfirmPaymentData {
  invoiceId: string;
  paymentDate: Date;
  notes?: string;
}

export class BillingService {
  constructor(private db: DrizzleD1Database<any>) {}

  async createInvoice(data: CreateInvoiceData) {
    const invoice = await this.db.insert(invoices).values({
      publicId: nanoid(),
      mitraId: data.mitraId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      dueDate: data.dueDate,
      qrisPayload: generateQRIS({
        amount: data.amount,
        invoiceId: nanoid(),
        description: data.description || 'Payment'
      }),
      createdAt: new Date(),
    }).returning();

    return invoice[0];
  }

  async getInvoicesByMitra(mitraId: string, status?: string, limit = 20) {
    let query = this.db
      .select()
      .from(invoices)
      .where(eq(invoices.mitraId, mitraId))
      .limit(limit);

    if (status && status !== 'all') {
      query = query.where(and(
        eq(invoices.mitraId, mitraId),
        eq(invoices.status, status as any)
      ));
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

    const result = await this.db
      .select()
      .from(invoices)
      .where(whereClause);

    return result[0];
  }

  async confirmPayment({ invoiceId, paymentDate, _notes }: ConfirmPaymentData) {
    const invoice = await this.getInvoiceByPublicId(invoiceId);
    
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Invoice already paid');
    }

    const updatedInvoice = await this.db
      .update(invoices)
      .set({
        status: 'paid',
        paidAt: paymentDate,
      })
      .where(eq(invoices.publicId, invoiceId))
      .returning();

    if (invoice.type === 'subscription') {
      await this.db
        .update(mitras)
        .set({ subscriptionStatus: 'active' })
        .where(eq(mitras.id, invoice.mitraId));
    }

    return {
      invoice: updatedInvoice[0],
      mitraSubscriptionStatus: 'active'
    };
  }

  async generateMonthlyInvoices() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const eligibleMitras = await this.db
      .select()
      .from(mitras)
      .where(
        and(
          eq(mitras.subscriptionStatus, 'active'),
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
            eq(invoices.type, 'subscription'),
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
          type: 'subscription',
          amount,
          description: `Subscription Fee: ${mitra.activeDriverLimit} drivers for ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
          dueDate,
        });

        results.push(invoice);
      }
    }

    return results;
  }
}