import { Hono } from "hono";

import type { ServiceContainer } from "../../services/factory";

type AppContext = {
  Variables: {
    services: ServiceContainer;
  };
};

const payment = new Hono<AppContext>();

payment.get("/:publicInvoiceId", async c => {
  const { publicInvoiceId } = c.req.param();
  const { billingService } = c.get("services");

  const invoiceDetails = await billingService.getPublicInvoiceDetails(publicInvoiceId);
  return c.json(invoiceDetails);
});

export { payment };
