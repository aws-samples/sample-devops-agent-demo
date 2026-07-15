#!/bin/bash
# Update favicon with the generated CRM logo
# This script should be run after generate-crm-assets.sh

LOGO_32="lib/stacks/frontend/app/public/crm/branding/logo-32.png"
FAVICON="lib/stacks/frontend/app/public/favicon.png"

if [ -f "$LOGO_32" ]; then
    echo "📋 Copying CRM logo to favicon..."
    cp "$LOGO_32" "$FAVICON"
    echo "✅ Favicon updated with CRM logo"
else
    echo "⚠️  Logo not found at $LOGO_32"
    echo "   Run ./tools/generate-crm-assets.sh first"
    exit 1
fi
