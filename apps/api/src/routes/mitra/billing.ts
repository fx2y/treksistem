import { Hono } from 'hono';
import { BillingService } from '../../services/billing.service';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono<{
  Variables: {
    mitraId: string;
    db: any;
  };
}>();

const querySchema = z.object({
  status: z.enum(['pending', 'paid', 'all']).optional().default('all'),
  limit: z.string().transform(Number).optional().default('20'),
});

app.get('/invoices', zValidator('query', querySchema), async (c) => {
  const { status, limit } = c.req.valid('query');
  const mitraId = c.get('mitraId');
  const db = c.get('db');

  const billingService = new BillingService(db);
  const invoices = await billingService.getInvoicesByMitra(mitraId, status, limit);

  return c.json({
    invoices: invoices.map(invoice => ({
      invoiceId: invoice.publicId,
      type: invoice.type,
      status: invoice.status,
      amount: invoice.amount,
      currency: invoice.currency,
      dueDate: invoice.dueDate?.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
    })),
  });
});

app.get('/invoices/:invoiceId', async (c) => {
  const invoiceId = c.req.param('invoiceId');
  const mitraId = c.get('mitraId');
  const db = c.get('db');

  const billingService = new BillingService(db);
  const invoice = await billingService.getInvoiceByPublicId(invoiceId, mitraId);

  if (!invoice) {
    return c.json({ error: 'Invoice not found' }, 404);
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

export default app;