#!/bin/bash

##############################################################################
# GitHub Repository Setup Script
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

print_header "🐙 GitHub Repository Setup"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed"
    echo ""
    print_info "Install it with:"
    echo "  brew install gh"
    echo ""
    exit 1
fi

print_success "GitHub CLI found"

# Check if user is logged in
if ! gh auth status &> /dev/null; then
    print_warning "You need to login to GitHub CLI"
    echo ""
    print_info "Running: gh auth login"
    gh auth login
fi

print_success "GitHub CLI authenticated"

# Get repository details
REPO_NAME="Samaanai_apps"
DESCRIPTION="SamaanAi - Nutrition & Task Management Platform"

print_info "Repository name: $REPO_NAME"
print_info "Description: $DESCRIPTION"
echo ""

# Create GitHub repository
print_info "Creating GitHub repository..."
if gh repo create "$REPO_NAME" --public --description "$DESCRIPTION" --source=. --remote=origin --push; then
    print_success "Repository created and code pushed!"
else
    print_error "Failed to create repository"
    print_info "The repository might already exist. Checking..."

    # Check if remote already exists
    if git remote get-url origin &> /dev/null; then
        REMOTE_URL=$(git remote get-url origin)
        print_info "Remote 'origin' already exists: $REMOTE_URL"
        print_info "Pushing code..."
        git push -u origin main
        print_success "Code pushed to existing repository"
    else
        exit 1
    fi
fi

# Get repository URL
REPO_URL=$(git remote get-url origin | sed 's/\.git$//')
if [[ $REPO_URL == git@* ]]; then
    REPO_URL=$(echo $REPO_URL | sed 's|git@github.com:|https://github.com/|')
fi

print_header "📝 Adding GitHub Secrets"

OUTPUT_DIR="./gcp-setup-output"

# Read project IDs and service account keys
STAGING_PROJECT_ID="samaanai-stg-1009-124126"
PROD_PROJECT_ID="samaanai-prod-1009-124126"

print_info "Adding GCP_PROJECT_ID_STAGING..."
echo -n "$STAGING_PROJECT_ID" | gh secret set GCP_PROJECT_ID_STAGING
print_success "GCP_PROJECT_ID_STAGING added"

print_info "Adding GCP_PROJECT_ID_PROD..."
echo -n "$PROD_PROJECT_ID" | gh secret set GCP_PROJECT_ID_PROD
print_success "GCP_PROJECT_ID_PROD added"

if [ -f "$OUTPUT_DIR/github-actions-staging-key.json" ]; then
    print_info "Adding GCP_SA_KEY_STAGING..."
    gh secret set GCP_SA_KEY_STAGING < "$OUTPUT_DIR/github-actions-staging-key.json"
    print_success "GCP_SA_KEY_STAGING added"
else
    print_error "Service account key not found: $OUTPUT_DIR/github-actions-staging-key.json"
fi

if [ -f "$OUTPUT_DIR/github-actions-prod-key.json" ]; then
    print_info "Adding GCP_SA_KEY_PROD..."
    gh secret set GCP_SA_KEY_PROD < "$OUTPUT_DIR/github-actions-prod-key.json"
    print_success "GCP_SA_KEY_PROD added"
else
    print_error "Service account key not found: $OUTPUT_DIR/github-actions-prod-key.json"
fi

print_header "🎉 GitHub Setup Complete!"

echo ""
print_success "Repository URL: $REPO_URL"
print_success "All 4 GitHub Secrets added"
echo ""

print_info "Next steps:"
echo "  1. Create staging branch: git checkout -b staging"
echo "  2. Push staging branch: git push -u origin staging"
echo "  3. GitHub Actions will automatically deploy to staging!"
echo ""

print_info "Repository secrets page:"
echo "  $REPO_URL/settings/secrets/actions"
echo ""

exit 0
