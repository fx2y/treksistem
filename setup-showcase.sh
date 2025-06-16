#!/bin/bash

# Master Showcase Setup Script
# 
# This script sets up the complete showcase environment by:
# 1. Seeding the database with showcase data
# 2. Generating JWT tokens for all personas
# 3. Providing ready-to-use environment variables

set -e  # Exit on any error

echo "🎭 Treksistem Showcase Environment Setup"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "scripts" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    echo "   Please cd to the Treksistem project directory first"
    exit 1
fi

# Check if required files exist
if [ ! -f "scripts/setup-showcase-data.js" ]; then
    echo "❌ Error: Showcase seeding script not found"
    echo "   Expected: scripts/setup-showcase-data.js"
    exit 1
fi

if [ ! -f "scripts/generate-showcase-tokens.js" ]; then
    echo "❌ Error: JWT generation script not found"
    echo "   Expected: scripts/generate-showcase-tokens.js"
    exit 1
fi

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
    echo "⚠️  Warning: .dev.vars file not found"
    echo "   JWT generation will use a fallback secret"
    echo "   For production setup, create .dev.vars with your JWT_SECRET"
    echo ""
fi

echo "📦 Step 1: Seeding showcase database..."
echo "----------------------------------------"
if pnpm run db:seed:showcase; then
    echo "✅ Database seeding completed successfully"
else
    echo "❌ Database seeding failed"
    exit 1
fi

echo ""
echo "🔐 Step 2: Generating JWT tokens..."
echo "-----------------------------------"
if node scripts/generate-showcase-tokens.js; then
    echo "✅ JWT tokens generated successfully"
else
    echo "❌ JWT token generation failed"
    exit 1
fi

echo ""
echo "🎉 Showcase Environment Ready!"
echo "=============================="
echo ""
echo "Your showcase environment has been successfully set up with:"
echo "• Master Admin (admin@treksistem.com)"
echo "• Mitra Bu Ani (bu.ani@example.com) - Katering Bu Ani business"
echo "• Driver Budi (budi.driver@example.com) - Active driver"
echo "• Customer Andi (andi.customer@example.com)"
echo "• 3 completed historical orders for logbook demo"
echo "• 1 pending subscription invoice for billing demo"
echo ""
echo "💡 Next Steps:"
echo "1. Copy the export commands above to set your environment variables"
echo "2. Start the API server: pnpm dev:api"
echo "3. Start the frontend apps: pnpm dev:mitra, pnpm dev:driver, pnpm dev:public"
echo "4. You're ready for the showcase!"
echo ""
echo "📚 Token Usage Examples:"
echo "curl -H \"Authorization: Bearer \$TOKEN_ADMIN\" http://localhost:8787/api/admin/..."
echo "curl -H \"Authorization: Bearer \$TOKEN_BU_ANI\" http://localhost:8787/api/mitra/..."
echo "curl -H \"Authorization: Bearer \$TOKEN_BUDI\" http://localhost:8787/api/driver/..."
echo ""
echo "🎭 Happy showcasing!"