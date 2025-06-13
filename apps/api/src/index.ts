import { createAuthServices, type AuthEnvironment } from "@treksistem/auth";
import { createDbClient } from "@treksistem/db";
import { Hono } from "hono";
import { BillingService } from "./services/billing.service";

import admin from "./routes/admin";
import auth from "./routes/auth";
import driver from "./routes/driver";
import mitra from "./routes/mitra";
import notifications from "./routes/notifications";
import pub from "./routes/public";
import uploads from "./routes/uploads";

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
    R2_BUCKET: R2Bucket;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_PUBLIC_URL: string;
    UPLOAD_URL_EXPIRES_IN_SECONDS: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
  };
}>();

app.use("*", async (c, next) => {
  const authEnv: AuthEnvironment = {
    DB: c.env.DB,
    GOOGLE_CLIENT_ID: c.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: c.env.GOOGLE_CLIENT_SECRET,
    JWT_SECRET: c.env.JWT_SECRET,
    FRONTEND_URL: c.env.FRONTEND_URL,
  };

  const authServices = createAuthServices(authEnv);
  c.set("authServices", authServices);

  await next();
});

app.get("/", c => {
  return c.text("Hello from Treksistem API!");
});

app.route("/api/auth", auth);
app.route("/api/mitra", mitra);
app.route("/api/driver", driver);
app.route("/api/admin", admin);
app.route("/api/notifications", notifications);
app.route("/api/public", pub);
app.route("/api/uploads", uploads);

export default {
  fetch: app.fetch,
  async scheduled(event, env, _ctx) {
    const db = createDbClient(env.DB);
    const billingService = new BillingService(db);
    
    switch (event.cron) {
      case "0 0 1 * *": // Monthly on the 1st at midnight
        console.log("Running monthly invoice generation...");
        try {
          const invoices = await billingService.generateMonthlyInvoices();
          console.log(`Generated ${invoices.length} invoices`);
        } catch (error) {
          console.error("Monthly invoice generation failed:", error);
        }
        break;
    }
  },
};
