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
import webhooks from "./routes/webhooks";
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

// Schema validation flag to ensure we only run it once per worker
let schemaValidated = false;

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

  // Run schema validation once per worker startup
  if (!schemaValidated) {
    try {
      await services.schemaValidationService.ensureSchemaValid();
      console.log("Schema validation passed");
      schemaValidated = true;
    } catch (error) {
      console.error("Schema validation failed:", error);
      // In production, you might want to fail fast here
      // throw error;
    }
  }

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
app.route("/api/webhooks", webhooks);
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
      err.statusCode as
        | 200
        | 201
        | 202
        | 204
        | 300
        | 301
        | 302
        | 304
        | 400
        | 401
        | 403
        | 404
        | 409
        | 422
        | 429
        | 500
        | 502
        | 503
        | 504
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

// Export the app instance for testing
export { app };

// Export AppType for Hono RPC client typing
export type AppType = typeof app;

export default {
  fetch: app.fetch,
  async scheduled(event: { cron: string }, env: any, _ctx: ExecutionContext) {
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

      case "0 2 * * *": // Daily at 2 AM
        console.log("Running daily cleanup tasks...");
        try {
          // Clean up expired OAuth sessions and refresh tokens
          await services.authService.cleanupExpiredSessions();
          console.log("Cleaned up expired auth sessions");

          // Clean up expired rate limit entries
          await services.rateLimitService.cleanup();
          console.log("Cleaned up expired rate limit entries");
        } catch (error) {
          console.error("Failed to run cleanup tasks:", error);
        }
        break;
    }
  },
};
