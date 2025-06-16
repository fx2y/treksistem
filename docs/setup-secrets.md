# Required Cloudflare Secrets Setup

The Treksistem production deployment requires the following secrets to be configured. Run these commands after obtaining the actual credentials:

## Google OAuth Credentials

```bash
wrangler secret put GOOGLE_CLIENT_ID
# Enter your Google OAuth Client ID

wrangler secret put GOOGLE_CLIENT_SECRET
# Enter your Google OAuth Client Secret
```

## JWT Secret (generate a random 32+ character string)

```bash
wrangler secret put JWT_SECRET
# Enter a secure random string (minimum 32 characters)
```

## Cloudflare R2 Storage Credentials

```bash
wrangler secret put R2_ACCOUNT_ID
# Enter your Cloudflare Account ID: 43c9314cbfe4b685350a2cc29bd9bc5f

wrangler secret put R2_ACCESS_KEY_ID
# Enter your R2 API Token Access Key ID

wrangler secret put R2_SECRET_ACCESS_KEY
# Enter your R2 API Token Secret Access Key
```

## Optional: Alert Webhook (for monitoring)

```bash
wrangler secret put ALERT_WEBHOOK_URL
# Enter webhook URL for health monitoring alerts (e.g., Healthchecks.io)
```

## Current Deployment Status

- ✅ Infrastructure provisioned and configured
- ✅ API deployed to: https://treksistem-api.peller-opaqued.workers.dev
- ⚠️ Secrets need to be set for full functionality
- ⚠️ Queues disabled (requires Cloudflare Workers Paid plan)

## Next Steps After Setting Secrets

1. Test API health endpoint: `curl https://treksistem-api.peller-opaqued.workers.dev/health`
2. Run database migrations
3. Seed master data via API calls
4. Execute showcase setup script
