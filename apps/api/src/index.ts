import { createAuthServices, type AuthEnvironment } from "@treksistem/auth";
import { Hono } from "hono";

import { BaseError } from "./lib/errors";
import admin from "./routes/admin";
import auth from "./routes/auth";
import driver from "./routes/driver";
import mitra from "./routes/mitra";
import notifications from "./routes/notifications";
import pub from "./routes/public";
import { payment } from "./routes/public/payment";
import test from "./routes/test";
import uploads from "./routes/uploads";
import { createServices, type ServiceContainer } from "./services/factory";
import type { Bindings } from "./types";

const app = new Hono<{
  Bindings: Bindings & {
    FRONTEND_URL: string;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
  };
  Variables: {
    authServices: ReturnType<typeof createAuthServices>;
    services: ServiceContainer;
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

  const services = createServices(c.env);
  c.set("services", services);

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
app.route("/api/test", test);
app.route("/api/uploads", uploads);
app.route("/pay", payment);

app.onError((err, c) => {
  console.error("Unhandled error:", err);

  if (err instanceof BaseError) {
    return c.json(
      {
        error: err.message,
        code: err.code,
        ...(err.details && { details: err.details }),
      },
      err.statusCode as any
    );
  }

  return c.json(
    {
      error: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    },
    500
  );
});

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: any, _ctx: any) {
    const services = createServices(env);

    switch (event.cron) {
      case "0 0 1 * *": // Monthly on the 1st at midnight
        console.log("Generating monthly subscription invoices...");
        try {
          const results =
            await services.billingService.generateMonthlySubscriptionInvoices();
          console.log(`Generated ${results.length} monthly invoices`);
        } catch (error) {
          console.error("Failed to generate monthly invoices:", error);
        }
        break;
    }
  },
};
