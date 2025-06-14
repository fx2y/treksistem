# Day-0 Technical Setup & First Deployment

## Section 1: Introduction & System Philosophy

Treksistem is an ultra-low-cost multi-tenant logistics platform designed as a "CMS for Logistics" specifically for Indonesian small businesses (UMKM). The platform is built on the principle of _ta'awun_ (mutual help), enabling local businesses to offer delivery services to their communities at minimal operational cost.

### Why Cloudflare Stack?

The entire platform is built on the Cloudflare serverless ecosystem to achieve near-zero operational costs:

- **Cloudflare Workers**: API runs completely serverless with automatic scaling
- **Cloudflare D1**: SQLite-based database with generous free tier
- **Cloudflare R2**: Object storage for photos and documents at minimal cost
- **Cloudflare Pages**: Frontend hosting with global CDN

This architecture choice eliminates traditional server costs, database hosting fees, and complex infrastructure management.

### Monorepo Structure

```
/
├── apps/                 # User-facing applications
│   ├── api/             # Hono backend API (Cloudflare Workers)
│   ├── mitra-portal/    # SvelteKit app for business owners
│   ├── driver-pwa/      # SvelteKit PWA for drivers
│   └── public-site/     # SvelteKit site for end-users
├── packages/            # Shared business logic
│   ├── auth/           # Google OAuth & JWT handling
│   ├── db/             # Drizzle schema & migrations
│   ├── geo/            # OSRM distance calculations
│   ├── notifications/  # WhatsApp link generation
│   ├── storage/        # R2 pre-signed URLs
│   └── ui/             # Shared Svelte components
```

## Section 2: Local Environment Setup

### Step 2.1: Prerequisites

Install the following tools:

- **Node.js v20+**: [Download](https://nodejs.org/)
- **PNPM v9+**: `npm install -g pnpm@9`
- **Wrangler CLI**: `npm install -g wrangler`

Verify installations:

```bash
node --version    # Should be v20+
pnpm --version    # Should be 9.x
wrangler --version # Should be 3.x
```

### Step 2.2: Clone & Install

```bash
git clone https://github.com/your-org/treksistem.git
cd treksistem
pnpm install
```

### Step 2.3: Configure Secrets

This is the most critical setup step. You must configure both local development variables and production secrets.

#### Local Development Variables

1. Copy the template:

```bash
cp wrangler.toml .dev.vars
```

2. Edit `.dev.vars` and fill in the `[vars]` section:

**CRITICAL**: `.dev.vars` is for local development only and **must not be committed to git**.

```toml
[vars]
# Google OAuth 2.0 - Get these from Google Cloud Console
GOOGLE_CLIENT_ID = "your-google-client-id.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "your-google-client-secret"

# JWT Security - Generate a secure random string of at least 32 characters
JWT_SECRET = "your-very-secure-random-string-at-least-32-characters-long"

# R2 Storage - Find this in your Cloudflare R2 dashboard
R2_PUBLIC_URL = "https://pub-your-actual-r2-bucket-id.r2.dev"

GOOGLE_REDIRECT_URI = "http://localhost:8787/api/auth/callback/google"
UPLOAD_URL_EXPIRES_IN_SECONDS = "300"
```

#### Production Secrets

Set these secrets using Wrangler (they won't be stored in files):

```bash
# R2 Storage credentials - Get these from Cloudflare R2 API tokens
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY

# For production, also set these via Wrangler
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

## Section 3: Database Initialization

### Step 3.1: Create D1 Database

1. Log into Cloudflare Dashboard
2. Go to **Workers & Pages** > **D1**
3. Click **Create database**
4. Name: `treksistem-db-local` (for local) and `treksistem-db-prod` (for production)
5. Copy the **Database ID** from the dashboard

### Step 3.2: Configure wrangler.toml

Edit `wrangler.toml` and update the database_id:

```toml
[[d1_databases]]
binding = "DB"
database_name = "treksistem-db-local"
database_id = "your-actual-database-id-from-step-3.1"
migrations_dir = "packages/db/migrations"
```

### Step 3.3: Apply Migrations

Run this command from the project root to create all necessary tables:

```bash
pnpm --filter @treksistem/db wrangler d1 migrations apply treksistem-db-local --local
```

This command:

- Uses Drizzle ORM migrations located in `packages/db/migrations`
- Creates tables: users, mitras, services, orders, order_stops, drivers, vehicles, etc.
- Sets up indexes and relationships

## Section 4: First-Time Deployment to Cloudflare

While the repository has CI/CD for subsequent deployments, the first deployment should be manual to ensure all bindings are correct.

### Deploy Command

```bash
turbo deploy
```

This command:

1. **Builds the API**: Compiles TypeScript and bundles for Cloudflare Workers
2. **Deploys API**: Pushes to Cloudflare Workers with D1 and R2 bindings
3. **Builds Frontends**: Creates production builds of all SvelteKit apps
4. **Deploys Pages**: Pushes Mitra Portal, Driver PWA, and Public Site to Cloudflare Pages

### Verify Deployment

After deployment completes:

1. **API Health Check**: Visit `https://your-worker-domain.workers.dev/health`
2. **Mitra Portal**: Visit your Cloudflare Pages domain for mitra-portal
3. **Check Logs**: Use `wrangler tail` to monitor real-time logs

## Section 5: Seeding Initial Platform Data (Post-Deployment)

After deployment, the platform is empty. You must seed the "master data" that all Mitras will use.

### Getting Admin Access

Follow the Day-1 Operational Playbook to:

1. Create your admin user account
2. Elevate to admin role via database
3. Obtain your JWT token

### Seed Master Data

Use curl or Postman with your admin JWT token:

#### Vehicle Types

```bash
curl -X POST https://your-api-domain/api/admin/master-data/vehicle-types \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Motor", "icon": "🛵"}'

curl -X POST https://your-api-domain/api/admin/master-data/vehicle-types \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Mobil", "icon": "🚗"}'
```

#### Payload Types

```bash
curl -X POST https://your-api-domain/api/admin/master-data/payload-types \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Makanan Panas", "icon": "🍲"}'

curl -X POST https://your-api-domain/api/admin/master-data/payload-types \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Dokumen", "icon": "📄"}'
```

#### Facilities

```bash
curl -X POST https://your-api-domain/api/admin/master-data/facilities \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Box Pendingin", "icon": "❄️"}'

curl -X POST https://your-api-domain/api/admin/master-data/facilities \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Tas Thermal", "icon": "🧊"}'
```

## Completion

After these steps, your Treksistem platform is:

- ✅ Deployed to production on Cloudflare
- ✅ Database initialized with proper schema
- ✅ Master data seeded for Mitra use
- ✅ Ready for your first Pioneer Mitra onboarding

Proceed to the Day-1 Operational Playbook to begin onboarding your first businesses.
