import { Hono } from "hono";

import type { ServiceContainer } from "../../services/factory";

const app = new Hono<{
  Variables: {
    services: ServiceContainer;
  };
}>();

// Get all master data for service creation forms
app.get("/", async c => {
  const { masterDataService } = c.get("services");

  try {
    const masterData = await masterDataService.getMasterData();
    return c.json(masterData);
  } catch (error) {
    console.error("Error fetching master data:", error);
    return c.json({ error: "Failed to fetch master data" }, 500);
  }
});

export default app;
