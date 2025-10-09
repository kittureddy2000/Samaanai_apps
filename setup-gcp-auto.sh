#!/bin/bash

##############################################################################
# Samaanai - Automated GCP Environment Setup (Non-Interactive)
#
# This version runs completely automatically with sensible defaults
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

OUTPUT_DIR="./gcp-setup-output"
mkdir -p "$OUTPUT_DIR"

LOG_FILE="$OUTPUT_DIR/setup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

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

generate_secret() {
    openssl rand -base64 32 | tr -d '\n'
}

create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local project_id=$3

    if gcloud secrets describe "$secret_name" --project="$project_id" &> /dev/null; then
        print_info "Updating existing secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
            --project="$project_id" \
            --data-file=- > /dev/null
    else
        print_info "Creating secret: $secret_name"
        echo -n "$secret_value" | gcloud secrets create "$secret_name" \
            --project="$project_id" \
            --data-file=- > /dev/null
    fi
}

print_header "🚀 Samaanai Automated GCP Setup"

print_info "This script will create fresh staging and production environments automatically"
echo ""

# Check gcloud
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found"
    exit 1
fi

print_success "gcloud CLI found"

# Use existing project IDs with billing already enabled
STAGING_PROJECT_ID="samaanai-stg-1009-124126"
PROD_PROJECT_ID="samaanai-prod-1009-124126"
GCP_REGION="us-central1"

print_info "Using project IDs:"
print_info "  Staging: $STAGING_PROJECT_ID"
print_info "  Production: $PROD_PROJECT_ID"
print_info "  Region: $GCP_REGION"
echo ""

##############################################################################
# Setup Staging
##############################################################################

print_header "🧪 Setting up Staging Environment"

print_info "Using existing project: $STAGING_PROJECT_ID"
if gcloud projects describe "$STAGING_PROJECT_ID" &> /dev/null; then
    print_success "Project exists, configuring..."
    gcloud config set project "$STAGING_PROJECT_ID"
else
    print_info "Creating project: $STAGING_PROJECT_ID"
    if gcloud projects create "$STAGING_PROJECT_ID" --name="SamaanAi Staging" --set-as-default; then
        print_success "Staging project created"
        sleep 5
    else
        print_error "Failed to create staging project"
        print_error "You may need to:"
        print_error "  - Enable billing in your GCP account"
        print_error "  - Check if you have permission to create projects"
        exit 1
    fi
fi

gcloud config set project "$STAGING_PROJECT_ID"

# Enable APIs
print_info "Enabling APIs (this may take 30-60 seconds)..."
APIS=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "secretmanager.googleapis.com"
    "containerregistry.googleapis.com"
)

for api in "${APIS[@]}"; do
    print_info "Enabling $api..."
    gcloud services enable "$api" --project="$STAGING_PROJECT_ID" --quiet
    print_success "  ✓ $api"
done

# Create service account
SA_NAME="github-actions"
SA_EMAIL="$SA_NAME@$STAGING_PROJECT_ID.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SA_EMAIL" --project="$STAGING_PROJECT_ID" &> /dev/null; then
    print_info "Service account already exists, skipping creation"
else
    print_info "Creating service account..."
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="GitHub Actions - Staging" \
        --project="$STAGING_PROJECT_ID"
    print_success "Service account created"
fi

# Grant IAM roles
ROLES=(
    "roles/run.admin"
    "roles/storage.admin"
    "roles/secretmanager.secretAccessor"
    "roles/iam.serviceAccountUser"
)

print_info "Granting IAM roles..."
for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding "$STAGING_PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" \
        --quiet > /dev/null
done
print_success "IAM roles granted"

# Create service account key
KEY_FILE="$OUTPUT_DIR/github-actions-staging-key.json"
if [ -f "$KEY_FILE" ]; then
    print_info "Service account key already exists, skipping creation"
else
    print_info "Creating service account key..."
    gcloud iam service-accounts keys create "$KEY_FILE" \
        --iam-account="$SA_EMAIL" \
        --project="$STAGING_PROJECT_ID"
    print_success "Key created: $KEY_FILE"
fi

# Create secrets
print_info "Creating secrets..."

# Use placeholder database URL (user will update later)
STAGING_DB_URL="postgresql://user:password@host:5432/samaanai_staging?sslmode=require"
STAGING_JWT_SECRET=$(generate_secret)
STAGING_JWT_REFRESH_SECRET=$(generate_secret)
STAGING_GOOGLE_CLIENT_ID="staging-google-client-id-placeholder"
STAGING_GOOGLE_CLIENT_SECRET="staging-google-client-secret-placeholder"

create_or_update_secret "DATABASE_URL" "$STAGING_DB_URL" "$STAGING_PROJECT_ID"
create_or_update_secret "JWT_SECRET" "$STAGING_JWT_SECRET" "$STAGING_PROJECT_ID"
create_or_update_secret "JWT_REFRESH_SECRET" "$STAGING_JWT_REFRESH_SECRET" "$STAGING_PROJECT_ID"
create_or_update_secret "GOOGLE_CLIENT_ID" "$STAGING_GOOGLE_CLIENT_ID" "$STAGING_PROJECT_ID"
create_or_update_secret "GOOGLE_CLIENT_SECRET" "$STAGING_GOOGLE_CLIENT_SECRET" "$STAGING_PROJECT_ID"

print_success "Staging environment ready!"

##############################################################################
# Setup Production
##############################################################################

print_header "🚀 Setting up Production Environment"

print_info "Using existing project: $PROD_PROJECT_ID"
if gcloud projects describe "$PROD_PROJECT_ID" &> /dev/null; then
    print_success "Project exists, configuring..."
    gcloud config set project "$PROD_PROJECT_ID"
else
    print_info "Creating project: $PROD_PROJECT_ID"
    if gcloud projects create "$PROD_PROJECT_ID" --name="SamaanAi Production" --set-as-default; then
        print_success "Production project created"
        sleep 5
    else
        print_error "Failed to create production project"
        exit 1
    fi
fi

gcloud config set project "$PROD_PROJECT_ID"

# Enable APIs
print_info "Enabling APIs..."
for api in "${APIS[@]}"; do
    print_info "Enabling $api..."
    gcloud services enable "$api" --project="$PROD_PROJECT_ID" --quiet
    print_success "  ✓ $api"
done

# Create service account
SA_EMAIL_PROD="$SA_NAME@$PROD_PROJECT_ID.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SA_EMAIL_PROD" --project="$PROD_PROJECT_ID" &> /dev/null; then
    print_info "Service account already exists, skipping creation"
else
    print_info "Creating service account..."
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="GitHub Actions - Production" \
        --project="$PROD_PROJECT_ID"
    print_success "Service account created"
fi

# Grant IAM roles
print_info "Granting IAM roles..."
for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding "$PROD_PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL_PROD" \
        --role="$role" \
        --quiet > /dev/null
done
print_success "IAM roles granted"

# Create service account key
KEY_FILE_PROD="$OUTPUT_DIR/github-actions-prod-key.json"
if [ -f "$KEY_FILE_PROD" ]; then
    print_info "Service account key already exists, skipping creation"
else
    print_info "Creating service account key..."
    gcloud iam service-accounts keys create "$KEY_FILE_PROD" \
        --iam-account="$SA_EMAIL_PROD" \
        --project="$PROD_PROJECT_ID"
    print_success "Key created: $KEY_FILE_PROD"
fi

# Create secrets (DIFFERENT from staging!)
print_info "Creating secrets..."

PROD_DB_URL="postgresql://user:password@host:5432/samaanai?sslmode=require"
PROD_JWT_SECRET=$(generate_secret)
PROD_JWT_REFRESH_SECRET=$(generate_secret)
PROD_GOOGLE_CLIENT_ID="production-google-client-id-placeholder"
PROD_GOOGLE_CLIENT_SECRET="production-google-client-secret-placeholder"

create_or_update_secret "DATABASE_URL" "$PROD_DB_URL" "$PROD_PROJECT_ID"
create_or_update_secret "JWT_SECRET" "$PROD_JWT_SECRET" "$PROD_PROJECT_ID"
create_or_update_secret "JWT_REFRESH_SECRET" "$PROD_JWT_REFRESH_SECRET" "$PROD_PROJECT_ID"
create_or_update_secret "GOOGLE_CLIENT_ID" "$PROD_GOOGLE_CLIENT_ID" "$PROD_PROJECT_ID"
create_or_update_secret "GOOGLE_CLIENT_SECRET" "$PROD_GOOGLE_CLIENT_SECRET" "$PROD_PROJECT_ID"

print_success "Production environment ready!"

##############################################################################
# Generate Summary
##############################################################################

print_header "📄 Generating Summary"

SUMMARY_FILE="$OUTPUT_DIR/SETUP_SUMMARY.txt"
GITHUB_SECRETS_FILE="$OUTPUT_DIR/GITHUB_SECRETS_INSTRUCTIONS.txt"

cat > "$SUMMARY_FILE" << EOF
═══════════════════════════════════════════════════════════════════
  Samaanai GCP Environment Setup - COMPLETE ✓
═══════════════════════════════════════════════════════════════════

Setup completed on: $(date)

STAGING ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Project ID:        $STAGING_PROJECT_ID
  Region:            $GCP_REGION
  Service Account:   $SA_EMAIL
  Key File:          $KEY_FILE

  Secrets Created:
    ✓ DATABASE_URL (PLACEHOLDER - update this!)
    ✓ JWT_SECRET (auto-generated, strong)
    ✓ JWT_REFRESH_SECRET (auto-generated, strong)
    ✓ GOOGLE_CLIENT_ID (PLACEHOLDER - update if using OAuth)
    ✓ GOOGLE_CLIENT_SECRET (PLACEHOLDER - update if using OAuth)

PRODUCTION ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Project ID:        $PROD_PROJECT_ID
  Region:            $GCP_REGION
  Service Account:   $SA_EMAIL_PROD
  Key File:          $KEY_FILE_PROD

  Secrets Created:
    ✓ DATABASE_URL (PLACEHOLDER - update this!)
    ✓ JWT_SECRET (auto-generated, strong, DIFFERENT from staging!)
    ✓ JWT_REFRESH_SECRET (auto-generated, strong, DIFFERENT from staging!)
    ✓ GOOGLE_CLIENT_ID (PLACEHOLDER - update if using OAuth)
    ✓ GOOGLE_CLIENT_SECRET (PLACEHOLDER - update if using OAuth)

⚠️  ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. UPDATE DATABASE_URL secrets with your actual database connection strings:

     For staging:
     gcloud config set project $STAGING_PROJECT_ID
     echo -n "your-real-staging-db-url" | gcloud secrets versions add DATABASE_URL --data-file=-

     For production:
     gcloud config set project $PROD_PROJECT_ID
     echo -n "your-real-production-db-url" | gcloud secrets versions add DATABASE_URL --data-file=-

  2. ADD GITHUB SECRETS (see $GITHUB_SECRETS_FILE)

  3. CREATE STAGING BRANCH:
     git checkout -b staging && git push -u origin staging

  4. DEPLOY!

═══════════════════════════════════════════════════════════════════
EOF

cat > "$GITHUB_SECRETS_FILE" << EOF
═══════════════════════════════════════════════════════════════════
  GITHUB SECRETS CONFIGURATION
═══════════════════════════════════════════════════════════════════

Go to your GitHub repository:
  https://github.com/YOUR_USERNAME/Samaanai_apps/settings/secrets/actions

Click "New repository secret" and add these 4 secrets:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECRET 1: GCP_PROJECT_ID_STAGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: GCP_PROJECT_ID_STAGING
Value: $STAGING_PROJECT_ID

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECRET 2: GCP_PROJECT_ID_PROD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: GCP_PROJECT_ID_PROD
Value: $PROD_PROJECT_ID

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECRET 3: GCP_SA_KEY_STAGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: GCP_SA_KEY_STAGING
Value: (paste entire contents of $KEY_FILE)

To copy (macOS):
  cat $KEY_FILE | pbcopy

To view:
  cat $KEY_FILE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECRET 4: GCP_SA_KEY_PROD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: GCP_SA_KEY_PROD
Value: (paste entire contents of $KEY_FILE_PROD)

To copy (macOS):
  cat $KEY_FILE_PROD | pbcopy

To view:
  cat $KEY_FILE_PROD

═══════════════════════════════════════════════════════════════════
EOF

print_header "🎉 Setup Complete!"

echo ""
print_success "Staging: $STAGING_PROJECT_ID"
print_success "Production: $PROD_PROJECT_ID"
echo ""
print_warning "Don't forget to update DATABASE_URL secrets with your real database connection strings!"
echo ""
print_info "Next steps:"
echo "  1. cat $SUMMARY_FILE"
echo "  2. Update DATABASE_URL secrets"
echo "  3. cat $GITHUB_SECRETS_FILE"
echo "  4. Add GitHub Secrets"
echo "  5. git checkout -b staging && git push"
echo ""

exit 0
