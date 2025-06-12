**Project: Treksistem**

**Core:** Low-cost, multi-tenant logistics CMS for Indonesian UMKM on Cloudflare. Initial focus: A-to-B food delivery.

**Principles (Non-negotiable):**

- **Cost:** CF-first (Workers, D1, R2). Use FOSS alternatives (OSRM > Gmaps, `wa.me` > WA Biz API).
- **Tenancy:** All authenticated queries **MUST** be scoped by `mitraId` from Hono context.
- **Security:** Public-facing resources use unguessable `public_id` (NanoID). Pre-signed R2 uploads only. RBAC via Hono middleware.
- **Architecture:** Multi-stop first. `orders` table has **NO** geo fields; all location data is in `order_stops` (with `sequence`, `type`).
- **Async:** Event-driven. Midtrans webhook is the Single Source of Truth for billing status.

**Tech Stack:**

- **Monorepo:** Turborepo/PNPM.
- **Backend:** Hono on Cloudflare Workers.
- **DB:** Cloudflare D1 with Drizzle ORM.
- **Frontend:** SvelteKit/Next.js on Cloudflare Pages.
- **Storage/Auth/Billing:** R2 / Google OAuth (JWT) / Midtrans (Snap/Webhooks).

**Monorepo Structure (`/`):**

- `apps/`: `api`, `mitra-portal`, `driver-pwa`, `public-site`
- `packages/`: `db`, `auth`, `geo`, `notifications`, `ui`

**Data Model (Drizzle/D1):**

- **`users`**: `googleId`, `email`.
- **`mitras`**: Business info, `subscriptionStatus` (enum), `activeDriverLimit`.
- **`drivers`**: Links `userId` to `mitraId` (many-to-many).
- **`orders`**: `public_id` (NanoID), `status` (enum: `pending_dispatch`, `accepted`, `pickup`, `in_transit`, `delivered`, `cancelled`, `claimed`). **NO GEO FIELDS.**
- **`order_stops`**: `orderId`, `sequence`, `type` (`pickup`/`dropoff`), `lat`, `lng`, `status`.
- **`order_reports`**: `orderId`, `stage`, `photoUrl` (public R2 link).
- **`notification_logs`**: `orderId`, `status` (`generated`/`triggered`).

**API (Hono):**

- **Routing:** `/api/{admin,mitra,driver,public,webhooks}`.
- **AuthN/AuthZ Flow:**
  1.  Google OAuth -> JIT `users` provision -> return JWT.
  2.  Hono middleware verifies JWT.
  3.  `require<Role>Role` middleware checks DB, sets `mitraId`/`driverId` in context `c.set(...)`.

**Critical Workflows & Implementation:**

- **Distance Calc:** `packages/geo` **MUST** call external OSRM API. Haversine is forbidden.
- **File Upload (2-step):** 1) Client `POST /api/uploads/request-url` -> gets pre-signed URL. 2) Client `PUT`s file to R2. 3) Client sends returned `publicUrl` to `report` endpoint.
- **WA Notify (2-step Accountability):** 1) Backend generates `wa.me` link & creates `notification_logs` record (status: 'generated'). 2) Frontend **MUST** call `POST /api/notifications/:logId/triggered` after user clicks the link.
- **Order Claiming:** `POST /api/driver/orders/:orderId/claim` **MUST** use an atomic `UPDATE ... WHERE assignedDriverId IS NULL` to prevent race conditions.
- **Billing:** `mitras.subscriptionStatus` is updated **ONLY** by the Midtrans webhook handler. Enforcement middleware checks `activeDriverLimit` on `POST /api/mitra/drivers/invite`.

**Dev & Deploy:**

- `Dev`: `turbo run dev`.
- `DB Migrations`: `drizzle-kit generate` -> `wrangler d1 migrations apply`.
- `Deploy`: Automated via GitHub Actions on push to `main`
