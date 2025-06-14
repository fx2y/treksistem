### **Treksistem Developer Onboarding & Tactical Guide**

This document provides a high-density, tactical overview for developers. It is your primary reference for codebase structure, patterns, and day-to-day commands.

### **1. Project Overview**

- **Core:** A low-cost, multi-tenant logistics management platform ("CMS for Logistics") for Indonesian UMKM.
- **Initial Focus:** A-to-B food delivery for hyper-local businesses in Tier 2/3 cities.
- **Architecture:** Serverless, event-driven, built on the Cloudflare ecosystem.

### **2. Core Tactical Principles**

- **Ultra Low-Cost:** Prioritize Cloudflare stack (Workers, D1, R2, Pages). Use FOSS alternatives (OSRM over Google Maps, `wa.me` links over WhatsApp Business API for MVP).
- **Multi-Tenancy is Law:** Every resource (service, driver, order, etc.) belongs to a `Mitra`. All authenticated database queries **must** be scoped by the `mitraId` from the request context. No exceptions.
- **Security by Design:**
  - Public-facing resources use unguessable IDs (NanoID stored in `public_id`). Never expose sequential database IDs externally.
  - Use pre-signed URLs for all file uploads to R2. The client uploads directly to storage.
  - Authorization is role-based and enforced by Hono middleware.
- **Asynchronous & Event-Driven:** Key state changes are handled by external events. The primary example is Midtrans webhooks, which are the single source of truth for a Mitra's subscription status.
- **Multi-Stop First Architecture:** The `orders` table **does not** have origin/destination fields. All location data is in the related `order_stops` table. This is a non-negotiable architectural decision.

### **3. Tech Stack**

- **Monorepo:** Turborepo with PNPM workspaces.
- **Backend API:** Hono v4 on Cloudflare Workers, with `@hono/zod-validator` for input validation.
- **Database:** Cloudflare D1 (SQLite-based).
- **ORM:** Drizzle ORM & Drizzle Kit for migrations.
- **Frontend:** SvelteKit on Cloudflare Pages.
- **File Storage:** Cloudflare R2.
- **Authentication:** Google OAuth 2.0 (via `arctic` library) with JWTs (via `hono/jwt`).
- **Billing:** Midtrans (Snap API & Webhooks).
- **Testing:** Vitest.
- **Code Quality:** ESLint, Prettier, Husky, lint-staged.

### **4. Monorepo Structure & Usage**

```
/
├── apps/
│   ├── api/                # The Hono backend API. All business logic lives here.
│   ├── mitra-portal/       # SvelteKit app for business owners (Mitras) to manage their operations.
│   ├── driver-pwa/         # SvelteKit PWA for drivers to manage orders.
│   └── public-site/        # SvelteKit site for end-users to book and track orders.
├── packages/
│   ├── auth/               # Shared logic for Google OAuth, JWT handling, and Hono auth middleware.
│   ├── db/                 # Drizzle schema (source of truth), client, and migrations.
│   ├── geo/                # OSRM distance calculation service.
│   ├── notifications/      # `wa.me` link generation & accountability logging.
│   ├── storage/            # R2 pre-signed URL generation for file uploads.
│   └── ui/                 # Shared Svelte UI components (Buttons, Modals, etc.).
├── scripts/                # Verification and utility scripts.
└── wrangler.toml           # Cloudflare Worker configuration.
```

### **5. Data Model & Drizzle ORM Usage**

The database schema is the single source of truth, defined in `packages/db/src/schema/index.ts`.

**Common Query Patterns:**

- **Fetching with Relations (Most Common):** Use `db.query` and the `with` clause to avoid N+1 query problems.

  ```typescript
  // Usage: Fetch an order with its stops and the driver's name
  const orderDetails = await db.query.orders.findFirst({
    where: eq(orders.publicId, "some-public-id"),
    with: {
      orderStops: {
        orderBy: (stops, { asc }) => [asc(stops.sequence)],
      },
      assignedDriver: {
        with: {
          user: {
            columns: { name: true },
          },
        },
      },
    },
  });
  ```

- **Inserting Data:** Drizzle handles auto-generating IDs (`$defaultFn`).

  ```typescript
  // Usage: Create a new vehicle for a Mitra
  const newVehicle = await db
    .insert(vehicles)
    .values({
      mitraId: "mitra-id-from-context",
      licensePlate: "N1234ABC",
      description: "Honda Vario",
    })
    .returning()
    .then(rows => rows[0]);
  ```

- **Updating Data:** Use `db.update` with a `where` clause.

  ```typescript
  // Usage: Mark a specific order stop as completed
  await db
    .update(orderStops)
    .set({ status: "completed" })
    .where(eq(orderStops.id, "stop-id-from-params"));
  ```

### **6. API Architecture & Hono Usage**

The API in `apps/api` uses a middleware-centric pattern for auth and service injection.

- **Middleware Chain Example (`apps/api/src/routes/mitra.ts`):**

  ```typescript
  // All routes in this file will first require a valid JWT, then verify the user has a Mitra role.
  const app = new Hono()
    .use("*", authMiddleware.requireAuth, authMiddleware.requireMitraRole)
    .post("/services", c => {
      /* handler logic */
    });
  ```

- **Accessing Context in a Route Handler:**

  ```typescript
  // Inside a route handler, e.g., in `apps/api/src/routes/mitra/services.ts`
  app.post("/services", async c => {
    // Access role-specific ID injected by middleware
    const mitraId = c.get("mitraId");

    // Access services injected by the factory middleware
    const { mitraServiceManagement } = c.get("services");

    const body = await c.req.json();
    const newService = await mitraServiceManagement.createService(
      mitraId,
      body
    );

    return c.json(newService, 201);
  });
  ```

### **7. API Usage Examples (cURL)**

- **Mitra Invites a Driver:**

  ```bash
  curl -X POST http://localhost:8787/api/mitra/drivers/invite \
    -H "Authorization: Bearer <MITRA_JWT>" \
    -H "Content-Type: application/json" \
    -d '{"email": "new.driver@example.com"}'
  ```

- **Public User Creates an Order:**

  ```bash
  curl -X POST http://localhost:8787/api/public/orders \
    -H "Content-Type: application/json" \
    -d '{
          "serviceId": "service_1",
          "ordererName": "Customer Name",
          "ordererPhone": "08123456789",
          "recipientName": "Recipient Name",
          "recipientPhone": "08987654321",
          "stops": [
            {"address": "Jl. Merdeka 1, Malang", "lat": -7.98, "lng": 112.6, "type": "pickup"},
            {"address": "Jl. Sudirman 2, Malang", "lat": -7.99, "lng": 112.7, "type": "dropoff"}
          ]
        }'
  ```

- **Driver Claims an Order:**

  ```bash
  curl -X POST http://localhost:8787/api/driver/orders/order-id-from-broadcast/claim \
    -H "Authorization: Bearer <DRIVER_JWT>"
  ```

- **Driver Submits a Photo Report:**

  ```bash
  # Note: photoUrl comes from the 2-step R2 upload process
  curl -X POST http://localhost:8787/api/driver/orders/order-id/report \
    -H "Authorization: Bearer <DRIVER_JWT>" \
    -H "Content-Type: application/json" \
    -d '{
          "stage": "dropoff",
          "notes": "Package left at front desk.",
          "photoUrl": "https://pub-r2-bucket.r2.dev/reports/some-photo.jpg"
        }'
  ```

### **8. Critical Implementation Patterns**

- **File Uploads (2-Step Process):**

  ```typescript
  // 1. Frontend: Get a secure upload URL from our API
  const { signedUrl, publicUrl } = await apiClient.post(
    "/api/uploads/request-url",
    { fileName, contentType }
  );

  // 2. Frontend: Upload the file directly to R2 using the signed URL
  await fetch(signedUrl, { method: "PUT", body: file });

  // 3. Frontend: Save the public URL with the report
  await apiClient.post("/api/driver/orders/.../report", {
    photoUrl: publicUrl,
  });
  ```

- **WhatsApp Notification Accountability (2-Step Process):**

  ```typescript
  // 1. Backend: When creating an order, generate the link and a log ID.
  //    Returns { ..., notificationLogId: 'log_abc123' }

  // 2. Frontend (e.g., on order success page):
  async function handleShareToWhatsApp(logId, trackingUrl) {
    // FIRST, tell our backend the user is about to click the link.
    await apiClient.post(`/api/notifications/${logId}/triggered`);

    // THEN, redirect the user to WhatsApp.
    const message = `Track your order: ${trackingUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  }
  ```

- **Atomic Order Claiming (Race Condition Prevention):**

  ```typescript
  // Inside DriverWorkflowService.claimOrder
  const result = await db
    .update(orders)
    .set({ assignedDriverId: claimingDriverId, status: "claimed" })
    .where(
      and(
        eq(orders.id, orderId),
        isNull(orders.assignedDriverId) // CRITICAL: Only update if not already claimed
      )
    )
    .returning({ updatedId: orders.id });

  if (result.length === 0) {
    throw new ConflictError("Order was already claimed by another driver.");
  }
  ```

### **9. Developer's Cookbook**

- **Initial Setup:**

  1.  `pnpm install`

- **Environment Variables:**

  1.  Copy `wrangler.toml` to `.dev.vars` (Wrangler automatically loads this for local dev).
  2.  Fill in the required secrets in `.dev.vars` (e.g., `JWT_SECRET`, Google OAuth keys).

  Example `.dev.vars`:

  ```toml
  JWT_SECRET="a-very-secret-key-that-is-at-least-32-characters-long"
  GOOGLE_CLIENT_ID="..."
  GOOGLE_CLIENT_SECRET="..."
  # ... other vars
  ```

- **Running Locally:**

  - `pnpm dev`: Starts all apps concurrently.
  - `pnpm dev:api`: Starts only the Hono API.
  - `pnpm dev:mitra`: Starts only the Mitra Portal frontend.

- **Database Management:**

  - **Generate Migration:** `pnpm --filter @treksistem/db drizzle-kit generate`
  - **Apply Migration (Local):** `pnpm --filter @treksistem/db wrangler d1 migrations apply treksistem-db-local --local`
  - **Apply Migration (Prod):** `pnpm --filter @treksistem/db wrangler d1 migrations apply treksistem-db-prod`
  - **DB Studio (GUI):** `pnpm --filter @treksistem/db drizzle-kit studio`

- **Testing:**

  - **Run all tests:** `pnpm test`
  - **Run tests for one package:** `pnpm test --filter=@treksistem/db`

- **Code Quality:**

  - **Lint all:** `pnpm lint`
  - **Format all:** `pnpm format` (The pre-commit hook handles this for staged files).

- **Generating Test JWTs:**
  1.  Ensure test users exist in your local D1 database.
  2.  Run `node scripts/generate-test-jwt.js`.
  3.  Copy the generated tokens to use with `curl` or API clients like Postman/Insomnia.
