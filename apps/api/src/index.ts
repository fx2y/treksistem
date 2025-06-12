import { Hono } from "hono";

const app = new Hono();

app.get("/", c => {
  return c.text("Hello from Treksistem API!");
});

export default app;
