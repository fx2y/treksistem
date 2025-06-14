# Day-1 Operational Playbook

## Section 1: Becoming the Master Admin

The Treksistem platform has no default admin user for security reasons. The first admin must be manually created through a privileged database operation. This is a one-time setup that grants you platform-wide administrative access.

### Step 1.1: Create Your User Account

1. Navigate to your live Mitra Portal URL (deployed in Day-0)
2. Click **"Login with Google"**
3. Complete the Google OAuth flow with your designated admin email
4. You will be redirected to the dashboard (which will be mostly empty)

This action creates your user record in the `users` table via the "Just-In-Time" provisioning flow.

### Step 1.2: Elevate to Admin Role (The Critical Step)

**WARNING**: This is a privileged operation that should only be performed for trusted platform operators.

1. Connect to your production D1 database:

```bash
wrangler d1 execute treksistem-db-prod --command "SELECT id, email, role FROM users WHERE email = 'your-admin-email@example.com';"
```

2. Note your `user_id` from the output, then run this elevation command:

```bash
wrangler d1 execute treksistem-db-prod --command "UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';"
```

3. Verify the change:

```bash
wrangler d1 execute treksistem-db-prod --command "SELECT id, email, role FROM users WHERE email = 'your-admin-email@example.com';"
```

**Security Note**: The 'admin' role grants the ability to manage global platform settings and act on behalf of any Mitra. This access should be tightly controlled and logged.

### Step 1.3: Obtaining Your Admin Authentication Token

To use the admin APIs, you need a JWT Bearer token. Here's how to extract it:

1. **Log out** of the Mitra Portal completely
2. Open your browser's **Developer Tools** (F12)
3. Go to the **Network** tab
4. **Log back in** to the Mitra Portal with your admin Google account
5. In the Network tab, find a request to an API endpoint (like `/api/auth/me`)
6. Click on the request and inspect the **Request Headers**
7. Find the `Authorization` header and copy the entire value: `Bearer eyJ...`

**Important Notes:**

- This token is valid for a limited time (typically 15 minutes)
- You'll need to repeat this process to get a fresh token when it expires
- Store this token securely - it grants full admin access

## Section 2: The "Pioneer Mitra" Onboarding Playbook

This section implements the "Day-One Value" bootstrapping strategy. As the Master Admin, you will act as a digital consultant to manually set up the first 10 Pioneer Mitras completely free, demonstrating the platform's value.

### Play 1: Create the Mitra's User Account

**Goal**: Get the UMKM owner into the system

1. **Contact the business owner** and explain the free setup offer
2. **Have them visit** your Mitra Portal URL
3. **Guide them to click** "Login with Google" and complete OAuth
4. **Confirm their account creation** by checking the users table:

```bash
wrangler d1 execute treksistem-db-prod --command "SELECT id, email, name FROM users WHERE email = 'mitra-owner@example.com';"
```

### Play 2: Create the Mitra Business Entity

**Goal**: Link the user to a business entity in the system

The user account and business entity are separate by design. You must manually create this link:

1. **Get the user_id** from Play 1
2. **Create the Mitra record** with manual database insertion:

```bash
# Replace values with actual data from your conversation with the business owner
wrangler d1 execute treksistem-db-prod --command "
INSERT INTO mitras (id, user_id, business_name, subscription_status, active_driver_limit, address, phone)
VALUES ('mitra_pioneer_01', 'USER_ID_FROM_PLAY_1', 'Katering Lezat Bu Ani', 'free_tier', 2, 'Jl. Merdeka 10, Malang', '08123456789');
"
```

**Key Fields Explained:**

- `id`: Use a descriptive ID like `mitra_pioneer_01`
- `subscription_status`: Set to `'free_tier'` for the free offer
- `active_driver_limit`: Set to `2` drivers for the free tier

### Play 3: Configure the Mitra's First Service (On Their Behalf)

**Goal**: Pre-configure their delivery service so they're immediately operational

Use your admin JWT token from Section 1.3:

```bash
curl -X POST https://your-api-domain/api/admin/mitras/mitra_pioneer_01/services \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Antar Makanan Bu Ani",
    "isPublic": true,
    "maxRangeKm": 5
  }'
```

**API Response**: The API returns the service ID and details. Save this for the handover conversation.

**What this does**: Creates a ready-to-use delivery service with a 5km range that customers can immediately book from the public site.

### Play 4: Onboard the Mitra's First Driver

**Goal**: Get their driver into the system and connected to the business

This demonstrates the "Friction as a Feature" principle with a semi-manual process:

1. **Have the driver create their account**:

   - Give the driver the Mitra Portal URL
   - Have them log in once with their Google account

2. **Invite the driver via Admin API**:

```bash
curl -X POST https://your-api-domain/api/admin/mitras/mitra_pioneer_01/drivers/invite \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@example.com"
  }'
```

3. **Manual invitation link delivery**:
   - The API returns an invitation link
   - **Manually send this link** to the driver (via WhatsApp, SMS, etc.)
   - The driver clicks the link to accept and finalize the connection

**Why Manual**: This reinforces our "Friction as a Feature" philosophy - we keep costs down by using manual processes where automation would be expensive.

## Section 3: Handover and Ongoing Operations

### The Handover

After completing Plays 1-4, conduct a handover conversation with the Mitra:

1. **Show them their dashboard**:

   - Log into the Mitra Portal as them (or guide them through login)
   - Point out their pre-configured service: "Antar Makanan Bu Ani"
   - Show their connected driver in the Drivers section

2. **Walk through a test order**:

   - Use the Public Site to create a test order for their service
   - Show how orders appear in their dashboard
   - Demonstrate how the driver receives notifications

3. **Provide ongoing support contact**:
   - Give them your contact information for questions
   - Explain they can now manage everything independently

### Ongoing Monitoring (Admin Playbook)

As the Master Admin, establish these routine monitoring tasks:

#### Daily Checks (5 minutes)

**User & Mitra Management**:

```bash
# Get overview of platform growth
curl -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  https://your-api-domain/api/admin/mitras
```

**System Health Check**:

```bash
# Check for notification failures
wrangler d1 execute treksistem-db-prod --command "
SELECT COUNT(*) as failed_notifications
FROM notification_logs
WHERE status = 'failed' AND created_at > datetime('now', '-1 day');
"

# Check for unusual activity
wrangler d1 execute treksistem-db-prod --command "
SELECT COUNT(*) as todays_orders
FROM orders
WHERE created_at > datetime('now', '-1 day');
"
```

#### Weekly Checks (15 minutes)

**Pioneer Mitra Health**:

- Contact each Pioneer Mitra to check satisfaction
- Review order volumes and identify successful patterns
- Document feedback for platform improvements

**Billing & Subscriptions** (Post-MVP):

Once the billing system is activated:

```bash
# Check pending payments
wrangler d1 execute treksistem-db-prod --command "
SELECT i.public_id, m.business_name, i.amount_cents, i.due_date
FROM invoices i
JOIN mitras m ON i.mitra_id = m.id
WHERE i.status = 'pending' AND i.due_date < date('now');
"
```

**Manual Payment Confirmation** (for QRIS payments):

```bash
# After confirming bank transfer, mark invoice as paid
curl -X POST https://your-api-domain/api/admin/billing/invoices/INVOICE_ID/confirm-payment \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentDate": "2024-01-15T10:30:00Z",
    "notes": "Confirmed via bank statement"
  }'
```

#### Monthly Checks (30 minutes)

**Platform Growth Analysis**:

- Review Mitra acquisition rates
- Analyze successful vs. struggling Mitras
- Plan outreach for next month's Pioneer Mitras

**Cloudflare Resource Monitoring**:

- Check D1 database storage usage
- Review R2 storage costs
- Monitor Workers execution time and requests

**Cron Job Health**:
Check Cloudflare dashboard for:

- Monthly invoice generation (runs 1st of each month at 2 AM UTC)
- Daily overdue invoice checker (runs daily at 3 AM UTC)

#### Emergency Procedures

**Platform Down**:

1. Check Cloudflare Workers dashboard for errors
2. Review Wrangler logs: `wrangler tail`
3. Verify D1 database connectivity
4. Check R2 bucket permissions

**Data Recovery**:

- D1 has automatic backups in Cloudflare
- Critical data recovery instructions are in the Cloudflare dashboard

**Security Incident**:

1. Immediately rotate JWT secrets: `wrangler secret put JWT_SECRET`
2. Check audit logs for suspicious activity
3. Review Google OAuth application for unauthorized access

---

This playbook ensures smooth day-to-day operations while maintaining the ultra-low-cost principle that makes Treksistem accessible to Indonesian UMKM businesses.
