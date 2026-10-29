#!/bin/bash
# Master script to generate all AnyCompany CRM image assets using Amazon Bedrock Nova Canvas
# Total: 99 images, ~$3.96, ~17 minutes

set -e  # Exit on error

echo "🎨 Generating AnyCompany CRM Assets using Amazon Bedrock Nova Canvas"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Generation Plan:"
echo "  • Sales rep avatars:      12 images (~2 min,  ~\$0.48)"
echo "  • Company logos:          75 images (~13 min, ~\$3.00)"
echo "  • Industry icons:          5 images (~1 min,  ~\$0.20)"
echo "  • Empty state illustrations: 3 images (~1 min,  ~\$0.12)"
echo "  • App logo (4 sizes):      4 images (~1 min,  ~\$0.16)"
echo "  ────────────────────────────────────────────────────────"
echo "  • Total:                  99 images (~17 min, ~\$3.96)"
echo ""
echo "⚠️  This will take approximately 17 minutes due to rate limiting"
echo "⚠️  Estimated cost: \$3.96 (99 images × \$0.04 per image)"
echo ""

# Ask for confirmation
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "Starting generation..."
echo ""

# Track start time
START_TIME=$(date +%s)

# 1. Sales rep avatars (12 images, ~6 min)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👥 Step 1/5: Generating sales rep avatars (12 images)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 tools/generate-sales-avatars.py
echo ""

# 2. Company logos (75 images, ~38 min)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏢 Step 2/5: Generating company logos (75 images)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 tools/generate-company-logos.py
echo ""

# 3. Industry icons (5 images, ~3 min)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏭 Step 3/5: Generating industry icons (5 images)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 tools/generate-industry-icons.py
echo ""

# 4. Empty states (3 images, ~2 min)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📭 Step 4/5: Generating empty state illustrations (3 images)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 tools/generate-empty-states.py
echo ""

# 5. App logo (4 sizes, ~2 min)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Step 5/5: Generating app logo (4 sizes)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 tools/generate-app-logo.py
echo ""

# Calculate elapsed time
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Complete! All CRM assets generated successfully"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Assets saved to:"
echo "  • lib/stacks/frontend/app/public/avatars/"
echo "  • lib/stacks/frontend/app/public/crm/logos/"
echo "  • lib/stacks/frontend/app/public/crm/icons/"
echo "  • lib/stacks/frontend/app/public/crm/illustrations/"
echo "  • lib/stacks/frontend/app/public/crm/branding/"
echo ""
echo "⏱️  Total time: ${MINUTES}m ${SECONDS}s"
echo "💰 Estimated cost: \$3.96"
echo ""
echo "Next steps:"
echo "1. Review the generated images"
echo "2. Run task 22 to integrate images into CRM components"
echo "3. Update mockAccounts.ts to reference company logos"
echo "4. Update mockTeamData.ts avatarUrl paths (already correct)"
echo "5. Copy logo-32.png to public/favicon.png"
echo ""
