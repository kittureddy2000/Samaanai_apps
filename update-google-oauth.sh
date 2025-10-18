#!/bin/bash

##############################################################################
# Google OAuth Credentials Update Script
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

print_header "🔐 Update Google OAuth Credentials"

# Staging credentials
print_info "Enter STAGING Google OAuth credentials"
echo ""
read -p "Staging Client ID: " STAGING_CLIENT_ID
read -p "Staging Client Secret: " STAGING_CLIENT_SECRET
echo ""

# Production credentials
print_info "Enter PRODUCTION Google OAuth credentials"
echo ""
read -p "Production Client ID: " PROD_CLIENT_ID
read -p "Production Client Secret: " PROD_CLIENT_SECRET
echo ""

print_header "📝 Updating Secrets"

# Update staging secrets
print_info "Updating staging secrets..."
echo -n "$STAGING_CLIENT_ID" | gcloud secrets versions add GOOGLE_CLIENT_ID \
  --data-file=- \
  --project=samaanai-stg-1009-124126
print_success "Staging Client ID updated"

echo -n "$STAGING_CLIENT_SECRET" | gcloud secrets versions add GOOGLE_CLIENT_SECRET \
  --data-file=- \
  --project=samaanai-stg-1009-124126
print_success "Staging Client Secret updated"

# Update production secrets
print_info "Updating production secrets..."
echo -n "$PROD_CLIENT_ID" | gcloud secrets versions add GOOGLE_CLIENT_ID \
  --data-file=- \
  --project=samaanai-prod-1009-124126
print_success "Production Client ID updated"

echo -n "$PROD_CLIENT_SECRET" | gcloud secrets versions add GOOGLE_CLIENT_SECRET \
  --data-file=- \
  --project=samaanai-prod-1009-124126
print_success "Production Client Secret updated"

print_header "🎉 Secrets Updated Successfully!"

echo ""
print_info "Next steps:"
echo "  1. Redeploy the backend: git push origin staging"
echo "  2. Test Google OAuth login on the frontend"
echo ""

print_warning "Important: Make sure you added these redirect URIs in Google Cloud Console:"
echo ""
echo "  Staging:"
echo "    https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/auth/google/callback"
echo ""
echo "  Production:"
echo "    https://api.samaanai.com/api/v1/auth/google/callback"
echo ""
echo "  Authorized JavaScript Origins:"
echo "    https://mobile.samaanai.com"
echo ""

exit 0
