import { Hono } from "hono";

import { MitraService } from "../../services/mitra.service";

const app = new Hono();

// Get all master data for service creation forms
app.get("/", async c => {
  const mitraService = new MitraService(c.get("db"));

  try {
    const masterData = await mitraService.getMasterData();
    return c.json(masterData);
  } catch (error) {
    console.error("Error fetching master data:", error);
    return c.json({ error: "Failed to fetch master data" }, 500);
  }
});

export default app;
