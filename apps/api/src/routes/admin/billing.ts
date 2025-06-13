import { Hono } from 'hono';
import { BillingService } from '../../services/billing.service';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono<{
  Variables: {
    db: any;
    adminUserId: string;
  };
}>();

const confirmPaymentSchema = z.object({
  paymentDate: z.string().transform(date => new Date(date)),
  notes: z.string().optional(),
});

app.post('/invoices/:invoiceId/confirm-payment', zValidator('json', confirmPaymentSchema), async (c) => {
  const invoiceId = c.req.param('invoiceId');
  const { paymentDate, notes } = c.req.valid('json');
  const db = c.get('db');

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
    if (error.message === 'Invoice not found') {
      return c.json({ error: 'Invoice not found' }, 404);
    }
    if (error.message === 'Invoice already paid') {
      return c.json({ error: 'Invoice already paid' }, 409);
    }
    throw error;
  }
});

export default app;