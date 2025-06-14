# Treksistem

[![Build Status](https://github.com/fx2y/treksistem/actions/workflows/deploy.yml/badge.svg)](https://github.com/fx2y/treksistem/actions/workflows/deploy.yml)

An open-source, ultra-low-cost, multi-tenant logistics platform ("CMS for Logistics") designed to empower micro, small, and medium enterprises (UMKM) in Indonesia. This project is built with Hono on the Cloudflare serverless stack.

### Project Vision & State

Treksistem is an ambitious open-source project born from the principle of _ta'awun_ (mutual help). Our goal is to provide a powerful, flexible, and extremely affordable digital tool for small businesses, particularly in the culinary sector, who are often priced out of conventional logistics solutions.

This project is under active development. We are focused on building a robust and maintainable foundation. We welcome contributions and believe in building transparently, embracing imperfection as we iterate towards a stable and impactful product.

### Core Architectural Principles

To understand this codebase, you must understand these non-negotiable principles:

- **Ultra Low-Cost:** Every technical decision prioritizes minimizing operational costs. We use the Cloudflare stack (Workers, D1, R2) and prefer open-source alternatives (e.g., OSRM for routing) over expensive paid APIs.
- **Strict Multi-Tenancy:** The system is built for many businesses ("Mitra"). Every authenticated database query **must** be scoped by the `mitraId` of the currently logged-in user. There are no global resources accessible by tenants.
- **Security by Design:** Public-facing resources (like order tracking pages) use unguessable, non-sequential public IDs (`public_id`). We never expose sequential database IDs. All file uploads use pre-signed URLs directly to R2 storage.
- **Multi-Stop First Architecture:** The core `orders` data model is built to support multiple pickups and drop-offs from day one to avoid future technical debt. An order's route is defined by a related sequence of `order_stops`.

### Key Technical Features & Value Propositions

This project is more than a standard CRUD application. Here are some of its unique technical features:

- **Serverless, Edge-First Architecture:** Built entirely on the Cloudflare ecosystem for global low-latency and extreme cost-efficiency. The API is a Hono application running on Cloudflare Workers, a high-performance JavaScript/Wasm runtime.

- **Type-Safe from Database to Frontend:** We use Drizzle ORM with Cloudflare D1. This provides end-to-end type safety, meaning a change in your database schema will immediately show type errors in your API and frontend code, preventing a large class of bugs.

- **Multi-Stop Logistics Core:** Unlike simple A-to-B systems, our data model (`orders` related to multiple `order_stops`) is designed from the ground up to handle complex, multi-point delivery routes. This is a core architectural decision for future flexibility.

- **Role-Based, Auditable System:**

  - **Comprehensive RBAC:** A robust middleware chain in Hono enforces roles (`Admin`, `Mitra`, `Driver`) for every API endpoint.
  - **Complete Audit Trail:** Every significant action (creating a service, assigning a driver, confirming a payment) is recorded in an `audit_logs` table, providing full accountability. This includes an "impersonation" feature for admins acting on behalf of a Mitra.

- **"Friction as a Feature" for Cost Control:** We deliberately use low-cost, semi-manual workflows for non-critical tasks to keep the platform affordable.

  - **WhatsApp Notification Accountability:** Instead of a costly WhatsApp Business API, we generate `wa.me` links. To ensure accountability, the system uses a 2-step process: it logs the _generation_ of a link and requires the frontend to send a confirmation ping when the user _triggers_ it.
  - **Manual QRIS Billing:** The system generates QRIS payment payloads for invoices, but payment confirmation is a manual admin action. This avoids payment gateway fees while still digitizing the billing process for the Indonesian market.

- **Dynamic, Tenant-Configurable Services:** A Mitra (business owner) can define their own delivery services, including:

  - Custom pricing (base fee + per/km rate).
  - Service area (max radius).
  - Supported vehicle and payload types.
    This turns Treksistem into a true "CMS for Logistics" rather than a one-size-fits-all platform.

- **Efficient, Secure File Handling:** For proof-of-delivery photos, we use pre-signed URLs. The client gets a temporary, secure URL from our API and uploads the file directly to Cloudflare R2. This offloads bandwidth from our API workers, making it highly scalable and secure.

### Tech Stack

- **Monorepo:** [Turborepo](https://turbo.build/) with [PNPM](https://pnpm.io/) workspaces.
- **Backend:**
  - **Framework:** [Hono](https://hono.dev/) running on [Cloudflare Workers](https://workers.cloudflare.com/).
  - **Authentication:** [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2) with JWTs, implemented using the [Arctic](https://arctic.js.org/) library.
  - **Validation:** [Zod](https://zod.dev/) via `@hono/zod-validator`.
- **Database:**
  - **Engine:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite-based).
  - **ORM:** [Drizzle ORM](https://orm.drizzle.team/) for type-safe queries and schema management.
- **Frontend:**
  - **Framework:** [SvelteKit](https://kit.svelte.dev/) hosted on [Cloudflare Pages](https://pages.cloudflare.com/).
- **File Storage:** [Cloudflare R2](https://developers.cloudflare.com/r2/).
- **Billing:** [Midtrans](https://midtrans.com/) (Snap API & Webhooks) for Indonesian payment methods like QRIS.
- **Testing:** [Vitest](https://vitest.dev/).
- **Code Quality:** ESLint, Prettier, and Husky for pre-commit hooks.

### Monorepo Structure

This project uses a monorepo to manage all applications and shared packages.

```
/
├── apps/
│   ├── api/                # The Hono backend API. All business logic lives here.
│   ├── mitra-portal/       # SvelteKit app for business owners (Mitras).
│   ├── driver-pwa/         # SvelteKit PWA for drivers.
│   └── public-site/        # SvelteKit site for end-users to book and track orders.
├── packages/
│   ├── auth/               # Shared logic for Google OAuth, JWTs, and Hono auth middleware.
│   ├── db/                 # Drizzle schema (source of truth), client, and migrations.
│   ├── geo/                # OSRM distance calculation service.
│   ├── notifications/      # `wa.me` link generation & accountability logging.
│   ├── storage/            # R2 pre-signed URL generation for file uploads.
│   └── ui/                 # Shared Svelte UI components (Buttons, Modals, etc.).
├── scripts/                # Verification and utility scripts.
└── wrangler.toml           # Cloudflare Worker configuration.
```

### Getting Started

Follow these steps to get the project running on your local machine.

**1. Prerequisites:**

- Node.js (v20 or later)
- PNPM (v9 or later)
- A Cloudflare account with Wrangler CLI configured.
- A Google Cloud project for OAuth credentials.

**2. Clone the Repository:**

```bash
git clone https://github.com/fx2y/treksistem.git
cd treksistem
```

**3. Install Dependencies:**

```bash
pnpm install
```

**4. Environment Setup:**

The API server requires environment variables for secrets and configuration.

- Create a `.dev.vars` file in the root of the project by copying `wrangler.toml`:
  ```bash
  cp wrangler.toml .dev.vars
  ```
- Edit `.dev.vars` and fill in the required secrets under the `[vars]` section. **Do not commit this file.**

  Example `.dev.vars`:

  ```toml
  # ... other wrangler config ...

  [vars]
  # Auth configuration
  GOOGLE_CLIENT_ID = "your-google-client-id.apps.googleusercontent.com"
  GOOGLE_CLIENT_SECRET = "your-google-client-secret"
  JWT_SECRET = "a-secure-secret-key-that-is-at-least-32-characters-long"

  # R2 Public URL (find this in your R2 bucket settings)
  R2_PUBLIC_URL = "https://pub-your-r2-public-url.r2.dev"

  # ... other vars ...
  ```

**5. Database Setup:**

- First, ensure you have created a D1 database in your Cloudflare dashboard and have its `database_id` in your `wrangler.toml`.
- Apply the database migrations to your local D1 instance:
  ```bash
  pnpm --filter @treksistem/db wrangler d1 migrations apply treksistem-db-local --local
  ```

**6. Run the Development Server:**

This command will start the API and all frontend applications concurrently.

```bash
pnpm dev
```

- API will be available at `http://localhost:8787`.
- Mitra Portal will be available at `http://localhost:5173` (or another port).
- Other frontends will also start on their respective ports.

### Key Development Workflows

- **Database Migrations:**

  - To generate a new migration after changing the schema in `packages/db/src/schema/`:
    ```bash
    pnpm --filter @treksistem/db drizzle-kit generate
    ```
  - To view the database with a GUI:
    ```bash
    pnpm --filter @treksistem/db drizzle-kit studio
    ```

- **Testing:**

  - To run all tests across the monorepo:
    ```bash
    pnpm test
    ```
  - To run tests for a specific package (e.g., the geo service):
    ```bash
    pnpm test --filter=@treksistem/geo
    ```

- **Code Quality:**
  - To lint all files:
    ```bash
    pnpm lint
    ```
  - To format all files with Prettier:
    `bash
    pnpm format
    `
    _(Note: A pre-commit hook is set up with Husky to automatically lint and format staged files.)_

### Contributing

We welcome contributions of all kinds! Whether it's improving documentation, fixing a bug, or proposing a new feature, your help is appreciated.

Please feel free to open an issue to discuss your ideas or pick up an existing one. All pull requests will be reviewed.

### License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.
