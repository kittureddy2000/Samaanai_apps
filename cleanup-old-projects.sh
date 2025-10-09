#!/bin/bash

##############################################################################
# Cleanup Old GCP Projects
#
# This script helps you delete old/test GCP projects to start fresh
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

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

ask_yes_no() {
    local question=$1
    read -p "$(echo -e ${YELLOW}$question ${NC}[y/N]: )" response
    [[ "$response" =~ ^[Yy]$ ]]
}

print_header "🗑️  Cleanup Old GCP Projects"

echo "This script will help you delete old/unused GCP projects."
echo ""
print_warning "CAUTION: This will PERMANENTLY delete projects and all their resources!"
echo ""

# List all projects
print_info "Fetching your GCP projects..."
echo ""

gcloud projects list --format="table(projectId,name,projectNumber,createTime)" --sort-by=createTime

echo ""
print_header "Projects to Delete"

# Known projects from previous setup
OLD_STAGING="samaan-ai-staging-2025"
OLD_PRODUCTION="samaan-ai-production-2025"

echo "Do you want to delete these old projects?"
echo ""

# Check and delete staging
if gcloud projects describe "$OLD_STAGING" &> /dev/null; then
    print_info "Found: $OLD_STAGING (SamaanAi Staging)"
    if ask_yes_no "Delete $OLD_STAGING?"; then
        print_warning "Deleting $OLD_STAGING..."
        gcloud projects delete "$OLD_STAGING" --quiet
        print_success "Deleted: $OLD_STAGING"
    else
        print_info "Skipped: $OLD_STAGING"
    fi
else
    print_info "$OLD_STAGING not found (already deleted or doesn't exist)"
fi

echo ""

# Check and delete production
if gcloud projects describe "$OLD_PRODUCTION" &> /dev/null; then
    print_info "Found: $OLD_PRODUCTION (SamaanAi Production)"
    if ask_yes_no "Delete $OLD_PRODUCTION?"; then
        print_warning "Deleting $OLD_PRODUCTION..."
        gcloud projects delete "$OLD_PRODUCTION" --quiet
        print_success "Deleted: $OLD_PRODUCTION"
    else
        print_info "Skipped: $OLD_PRODUCTION"
    fi
else
    print_info "$OLD_PRODUCTION not found (already deleted or doesn't exist)"
fi

echo ""
print_header "Delete Other Projects (Manual)"

echo "If you want to delete other projects, you can:"
echo ""
echo "1. View all projects:"
echo "   gcloud projects list"
echo ""
echo "2. Delete a specific project:"
echo "   gcloud projects delete PROJECT_ID"
echo ""

print_warning "Note: Deleted projects can be recovered within 30 days"
print_info "To recover: gcloud projects undelete PROJECT_ID"

echo ""
print_success "Cleanup complete!"
echo ""

exit 0
