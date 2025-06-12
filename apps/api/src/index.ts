import { Hono } from "hono";

import admin from "./routes/admin";
import auth from "./routes/auth";
import driver from "./routes/driver";
import mitra from "./routes/mitra";
import pub from "./routes/public";

const app = new Hono<{
  Bindings: {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
  };
}>();

app.get("/", c => {
  return c.text("Hello from Treksistem API!");
});

app.route("/api/auth", auth);
app.route("/api/mitra", mitra);
app.route("/api/driver", driver);
app.route("/api/admin", admin);
app.route("/api/public", pub);

export default app;
