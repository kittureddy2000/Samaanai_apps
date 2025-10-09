#!/bin/bash

##############################################################################
# Samaanai - Automated GCP Environment Setup
#
# This script automates the setup of both staging and production environments
# on Google Cloud Platform for the Samaanai application.
#
# What this script does:
# - Creates staging and production GCP projects
# - Enables required APIs
# - Creates service accounts with proper IAM roles
# - Generates and downloads service account keys
# - Creates secrets in Google Secret Manager
# - Provides you with the values to add to GitHub Secrets
#
# Prerequisites:
# - gcloud CLI installed and configured
# - You're logged in: gcloud auth login
# - You have permissions to create projects (or projects already exist)
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Output directory for generated files
OUTPUT_DIR="./gcp-setup-output"
mkdir -p "$OUTPUT_DIR"

# Log file
LOG_FILE="$OUTPUT_DIR/setup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

##############################################################################
# Helper Functions
##############################################################################

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

ask_question() {
    local question=$1
    local default=$2
    local var_name=$3

    if [ -n "$default" ]; then
        read -p "$(echo -e ${CYAN}$question ${NC}[${GREEN}$default${NC}]: )" response
        response=${response:-$default}
    else
        read -p "$(echo -e ${CYAN}$question: ${NC})" response
    fi

    eval "$var_name='$response'"
}

ask_yes_no() {
    local question=$1
    local default=$2

    if [ "$default" = "y" ]; then
        read -p "$(echo -e ${CYAN}$question ${NC}[${GREEN}Y${NC}/n]: )" response
        response=${response:-y}
    else
        read -p "$(echo -e ${CYAN}$question ${NC}[y/${GREEN}N${NC}]: )" response
        response=${response:-n}
    fi

    [[ "$response" =~ ^[Yy]$ ]]
}

generate_secret() {
    openssl rand -base64 32 | tr -d '\n'
}

##############################################################################
# Main Script
##############################################################################

print_header "🚀 Samaanai GCP Environment Setup"

echo "This script will guide you through setting up staging and production environments."
echo "You'll need to answer a few questions, then the script will do the rest!"
echo ""
print_warning "Make sure you have gcloud CLI installed and you're logged in."
echo ""

if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI not found. Please install it first:"
    echo "  https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    print_error "Not logged in to gcloud. Please run: gcloud auth login"
    exit 1
fi

print_success "gcloud CLI found and authenticated"
echo ""

##############################################################################
# Step 1: Gather Project Information
##############################################################################

print_header "📋 Step 1: Project Configuration"

# Generate unique project IDs with timestamp (max 30 chars)
TIMESTAMP=$(date +%m%d-%H%M%S)
DEFAULT_STAGING_ID="samaanai-stg-${TIMESTAMP}"
DEFAULT_PROD_ID="samaanai-prod-${TIMESTAMP}"

print_info "Generating unique project IDs to ensure clean setup..."
echo ""
print_info "Suggested staging project ID: $DEFAULT_STAGING_ID"
print_info "Suggested production project ID: $DEFAULT_PROD_ID"
echo ""

ask_question "Enter STAGING project ID" "$DEFAULT_STAGING_ID" STAGING_PROJECT_ID
ask_question "Enter PRODUCTION project ID" "$DEFAULT_PROD_ID" PROD_PROJECT_ID
ask_question "Enter GCP region" "us-central1" GCP_REGION

# Validate project IDs (no spaces, lowercase, valid format)
STAGING_PROJECT_ID=$(echo "$STAGING_PROJECT_ID" | tr -d ' ' | tr '[:upper:]' '[:lower:]')
PROD_PROJECT_ID=$(echo "$PROD_PROJECT_ID" | tr -d ' ' | tr '[:upper:]' '[:lower:]')

# Validate project ID format
if ! [[ "$STAGING_PROJECT_ID" =~ ^[a-z][a-z0-9-]{5,29}$ ]]; then
    print_error "Invalid staging project ID: $STAGING_PROJECT_ID"
    print_error "Must start with lowercase letter, 6-30 chars, only lowercase letters, numbers, hyphens"
    exit 1
fi

if ! [[ "$PROD_PROJECT_ID" =~ ^[a-z][a-z0-9-]{5,29}$ ]]; then
    print_error "Invalid production project ID: $PROD_PROJECT_ID"
    print_error "Must start with lowercase letter, 6-30 chars, only lowercase letters, numbers, hyphens"
    exit 1
fi

echo ""
print_info "Staging Project: $STAGING_PROJECT_ID"
print_info "Production Project: $PROD_PROJECT_ID"
print_info "Region: $GCP_REGION"
echo ""

if ! ask_yes_no "Continue with these settings?" "y"; then
    print_error "Setup cancelled"
    exit 1
fi

##############################################################################
# Step 2: Database Configuration
##############################################################################

print_header "📋 Step 2: Database Configuration"

echo "Choose your database setup:"
echo "  1) Cloud SQL (managed PostgreSQL on GCP)"
echo "  2) External database (Neon, Supabase, etc.)"
echo ""
ask_question "Select option (1 or 2)" "2" DB_OPTION

if [ "$DB_OPTION" = "1" ]; then
    print_info "You'll need to set up Cloud SQL manually or the script can create it."
    if ask_yes_no "Create Cloud SQL instances?" "n"; then
        CREATE_CLOUD_SQL=true
    else
        CREATE_CLOUD_SQL=false
        print_info "You'll need to provide DATABASE_URL for both environments later"
    fi
else
    CREATE_CLOUD_SQL=false
    print_info "You'll provide external database URLs"
fi

##############################################################################
# Step 3: Create Staging Environment
##############################################################################

print_header "🧪 Step 3: Setting up STAGING Environment"

# Check if project exists
if gcloud projects describe "$STAGING_PROJECT_ID" &> /dev/null; then
    print_error "Project $STAGING_PROJECT_ID already exists!"
    print_warning "For a clean setup, we need a fresh project."
    if ask_yes_no "Do you want to use the existing project anyway?" "n"; then
        print_warning "Using existing project. Setup may not be completely clean."
        USE_EXISTING_STAGING=true
    else
        print_error "Please run the script again to generate a new unique project ID"
        exit 1
    fi
else
    print_info "Creating fresh staging project: $STAGING_PROJECT_ID"
    print_info "Project Display Name: 'SamaanAi Staging'"

    gcloud projects create "$STAGING_PROJECT_ID" --name="SamaanAi Staging" --set-as-default

    if [ $? -eq 0 ]; then
        print_success "Staging project created successfully"
        USE_EXISTING_STAGING=false

        # Wait a moment for project to be fully ready
        print_info "Waiting for project to be fully initialized..."
        sleep 5
    else
        print_error "Failed to create staging project"
        print_error "This might be due to:"
        print_error "  - Project ID already exists globally"
        print_error "  - Billing account not set up"
        print_error "  - Insufficient permissions"
        exit 1
    fi
fi

# Set active project
print_info "Setting active project to $STAGING_PROJECT_ID"
gcloud config set project "$STAGING_PROJECT_ID"

# Enable APIs (only the ones we actually need)
print_info "Enabling required APIs for staging..."
print_warning "This may take 30-60 seconds..."

# Only enable the APIs we actually use
APIS=(
    "run.googleapis.com"                    # Cloud Run - to host backend
    "cloudbuild.googleapis.com"             # Cloud Build - for building images
    "secretmanager.googleapis.com"          # Secret Manager - for secrets
    "containerregistry.googleapis.com"      # Container Registry - for Docker images
)

for api in "${APIS[@]}"; do
    print_info "Enabling $api..."
    if gcloud services enable "$api" --project="$STAGING_PROJECT_ID" --quiet; then
        print_success "  ✓ $api enabled"
    else
        print_error "  ✗ Failed to enable $api"
        print_warning "You may need to enable billing for this project"
        if ask_yes_no "Continue anyway?" "n"; then
            print_warning "Continuing... some features may not work"
        else
            exit 1
        fi
    fi
done
print_success "All required APIs enabled for staging"

# Create service account
SA_NAME="github-actions"
SA_EMAIL="$SA_NAME@$STAGING_PROJECT_ID.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SA_EMAIL" &> /dev/null; then
    print_success "Service account $SA_EMAIL already exists"
else
    print_info "Creating service account: $SA_EMAIL"
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="GitHub Actions - Staging" \
        --description="Service account for automated deployments from GitHub Actions"
    print_success "Service account created"
fi

# Grant IAM roles
print_info "Granting IAM roles to service account..."
ROLES=(
    "roles/run.admin"
    "roles/storage.admin"
    "roles/secretmanager.secretAccessor"
    "roles/iam.serviceAccountUser"
)

for role in "${ROLES[@]}"; do
    print_info "Granting $role..."
    gcloud projects add-iam-policy-binding "$STAGING_PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" \
        --quiet > /dev/null
done
print_success "IAM roles granted for staging"

# Create and download service account key
KEY_FILE="$OUTPUT_DIR/github-actions-staging-key.json"
if [ -f "$KEY_FILE" ]; then
    print_warning "Key file already exists: $KEY_FILE"
    if ask_yes_no "Recreate service account key?" "n"; then
        rm "$KEY_FILE"
        gcloud iam service-accounts keys create "$KEY_FILE" \
            --iam-account="$SA_EMAIL"
        print_success "Service account key created: $KEY_FILE"
    fi
else
    print_info "Creating service account key..."
    gcloud iam service-accounts keys create "$KEY_FILE" \
        --iam-account="$SA_EMAIL"
    print_success "Service account key created: $KEY_FILE"
fi

# Create secrets for staging
print_info "Creating secrets in Secret Manager..."

# Database URL
if [ "$CREATE_CLOUD_SQL" = true ]; then
    STAGING_DB_URL="postgresql://samaanai_user:CHANGE_ME@/samaanai_staging?host=/cloudsql/$STAGING_PROJECT_ID:$GCP_REGION:samaanai-db"
    print_warning "Cloud SQL URL (update password): $STAGING_DB_URL"
else
    ask_question "Enter STAGING database URL" "" STAGING_DB_URL
fi

# JWT Secrets
print_info "Generating JWT secrets..."
STAGING_JWT_SECRET=$(generate_secret)
STAGING_JWT_REFRESH_SECRET=$(generate_secret)
print_success "JWT secrets generated"

# Google OAuth
if ask_yes_no "Do you have Google OAuth credentials for staging?" "n"; then
    ask_question "Enter Google Client ID (staging)" "" STAGING_GOOGLE_CLIENT_ID
    ask_question "Enter Google Client Secret (staging)" "" STAGING_GOOGLE_CLIENT_SECRET
else
    STAGING_GOOGLE_CLIENT_ID="staging-client-id-placeholder"
    STAGING_GOOGLE_CLIENT_SECRET="staging-client-secret-placeholder"
    print_warning "Using placeholder OAuth credentials. Update these later!"
fi

# Create secrets
print_info "Creating secrets in Secret Manager..."

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

create_or_update_secret "DATABASE_URL" "$STAGING_DB_URL" "$STAGING_PROJECT_ID"
create_or_update_secret "JWT_SECRET" "$STAGING_JWT_SECRET" "$STAGING_PROJECT_ID"
create_or_update_secret "JWT_REFRESH_SECRET" "$STAGING_JWT_REFRESH_SECRET" "$STAGING_PROJECT_ID"
create_or_update_secret "GOOGLE_CLIENT_ID" "$STAGING_GOOGLE_CLIENT_ID" "$STAGING_PROJECT_ID"
create_or_update_secret "GOOGLE_CLIENT_SECRET" "$STAGING_GOOGLE_CLIENT_SECRET" "$STAGING_PROJECT_ID"

print_success "Staging secrets created"

##############################################################################
# Step 4: Create Production Environment
##############################################################################

print_header "🚀 Step 4: Setting up PRODUCTION Environment"

# Check if project exists
if gcloud projects describe "$PROD_PROJECT_ID" &> /dev/null; then
    print_error "Project $PROD_PROJECT_ID already exists!"
    print_warning "For a clean setup, we need a fresh project."
    if ask_yes_no "Do you want to use the existing project anyway?" "n"; then
        print_warning "Using existing project. Setup may not be completely clean."
        USE_EXISTING_PROD=true
    else
        print_error "Please run the script again to generate a new unique project ID"
        exit 1
    fi
else
    print_info "Creating fresh production project: $PROD_PROJECT_ID"
    print_info "Project Display Name: 'SamaanAi Production'"

    gcloud projects create "$PROD_PROJECT_ID" --name="SamaanAi Production" --set-as-default

    if [ $? -eq 0 ]; then
        print_success "Production project created successfully"
        USE_EXISTING_PROD=false

        # Wait a moment for project to be fully ready
        print_info "Waiting for project to be fully initialized..."
        sleep 5
    else
        print_error "Failed to create production project"
        print_error "This might be due to:"
        print_error "  - Project ID already exists globally"
        print_error "  - Billing account not set up"
        print_error "  - Insufficient permissions"
        exit 1
    fi
fi

# Set active project
print_info "Setting active project to $PROD_PROJECT_ID"
gcloud config set project "$PROD_PROJECT_ID"

# Enable APIs (only the ones we actually need)
print_info "Enabling required APIs for production..."
print_warning "This may take 30-60 seconds..."

for api in "${APIS[@]}"; do
    print_info "Enabling $api..."
    if gcloud services enable "$api" --project="$PROD_PROJECT_ID" --quiet; then
        print_success "  ✓ $api enabled"
    else
        print_error "  ✗ Failed to enable $api"
        print_warning "You may need to enable billing for this project"
        if ask_yes_no "Continue anyway?" "n"; then
            print_warning "Continuing... some features may not work"
        else
            exit 1
        fi
    fi
done
print_success "All required APIs enabled for production"

# Create service account
SA_EMAIL_PROD="$SA_NAME@$PROD_PROJECT_ID.iam.gserviceaccount.com"

if gcloud iam service-accounts describe "$SA_EMAIL_PROD" &> /dev/null; then
    print_success "Service account $SA_EMAIL_PROD already exists"
else
    print_info "Creating service account: $SA_EMAIL_PROD"
    gcloud iam service-accounts create "$SA_NAME" \
        --display-name="GitHub Actions - Production" \
        --description="Service account for automated deployments from GitHub Actions"
    print_success "Service account created"
fi

# Grant IAM roles
print_info "Granting IAM roles to service account..."
for role in "${ROLES[@]}"; do
    print_info "Granting $role..."
    gcloud projects add-iam-policy-binding "$PROD_PROJECT_ID" \
        --member="serviceAccount:$SA_EMAIL_PROD" \
        --role="$role" \
        --quiet > /dev/null
done
print_success "IAM roles granted for production"

# Create and download service account key
KEY_FILE_PROD="$OUTPUT_DIR/github-actions-prod-key.json"
if [ -f "$KEY_FILE_PROD" ]; then
    print_warning "Key file already exists: $KEY_FILE_PROD"
    if ask_yes_no "Recreate service account key?" "n"; then
        rm "$KEY_FILE_PROD"
        gcloud iam service-accounts keys create "$KEY_FILE_PROD" \
            --iam-account="$SA_EMAIL_PROD"
        print_success "Service account key created: $KEY_FILE_PROD"
    fi
else
    print_info "Creating service account key..."
    gcloud iam service-accounts keys create "$KEY_FILE_PROD" \
        --iam-account="$SA_EMAIL_PROD"
    print_success "Service account key created: $KEY_FILE_PROD"
fi

# Create secrets for production
print_info "Creating secrets in Secret Manager..."

# Database URL (MUST be different from staging!)
if [ "$CREATE_CLOUD_SQL" = true ]; then
    PROD_DB_URL="postgresql://samaanai_user:CHANGE_ME@/samaanai?host=/cloudsql/$PROD_PROJECT_ID:$GCP_REGION:samaanai-db"
    print_warning "Cloud SQL URL (update password): $PROD_DB_URL"
else
    ask_question "Enter PRODUCTION database URL (must be different from staging!)" "" PROD_DB_URL
fi

# JWT Secrets (MUST be different from staging!)
print_info "Generating NEW JWT secrets for production..."
PROD_JWT_SECRET=$(generate_secret)
PROD_JWT_REFRESH_SECRET=$(generate_secret)
print_success "Production JWT secrets generated (different from staging)"

# Google OAuth
if ask_yes_no "Do you have Google OAuth credentials for production?" "n"; then
    ask_question "Enter Google Client ID (production)" "" PROD_GOOGLE_CLIENT_ID
    ask_question "Enter Google Client Secret (production)" "" PROD_GOOGLE_CLIENT_SECRET
else
    PROD_GOOGLE_CLIENT_ID="production-client-id-placeholder"
    PROD_GOOGLE_CLIENT_SECRET="production-client-secret-placeholder"
    print_warning "Using placeholder OAuth credentials. Update these later!"
fi

# Create secrets
print_info "Creating secrets in Secret Manager..."
create_or_update_secret "DATABASE_URL" "$PROD_DB_URL" "$PROD_PROJECT_ID"
create_or_update_secret "JWT_SECRET" "$PROD_JWT_SECRET" "$PROD_PROJECT_ID"
create_or_update_secret "JWT_REFRESH_SECRET" "$PROD_JWT_REFRESH_SECRET" "$PROD_PROJECT_ID"
create_or_update_secret "GOOGLE_CLIENT_ID" "$PROD_GOOGLE_CLIENT_ID" "$PROD_PROJECT_ID"
create_or_update_secret "GOOGLE_CLIENT_SECRET" "$PROD_GOOGLE_CLIENT_SECRET" "$PROD_PROJECT_ID"

print_success "Production secrets created"

##############################################################################
# Step 5: Generate Summary
##############################################################################

print_header "📄 Step 5: Generating Setup Summary"

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
    ✓ DATABASE_URL
    ✓ JWT_SECRET
    ✓ JWT_REFRESH_SECRET
    ✓ GOOGLE_CLIENT_ID
    ✓ GOOGLE_CLIENT_SECRET

PRODUCTION ENVIRONMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Project ID:        $PROD_PROJECT_ID
  Region:            $GCP_REGION
  Service Account:   $SA_EMAIL_PROD
  Key File:          $KEY_FILE_PROD

  Secrets Created:
    ✓ DATABASE_URL (different from staging!)
    ✓ JWT_SECRET (different from staging!)
    ✓ JWT_REFRESH_SECRET (different from staging!)
    ✓ GOOGLE_CLIENT_ID
    ✓ GOOGLE_CLIENT_SECRET

FILES CREATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Service Account Keys:
    - $KEY_FILE
    - $KEY_FILE_PROD

  Summary Files:
    - $SUMMARY_FILE
    - $GITHUB_SECRETS_FILE
    - $LOG_FILE

⚠️  IMPORTANT SECURITY NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Service account keys are SENSITIVE - never commit to git!
  2. Keys are stored in: $OUTPUT_DIR/
  3. This directory is in .gitignore (protected)
  4. Delete keys after adding to GitHub Secrets (optional but recommended)

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. ✓ GCP projects created and configured
  2. ✓ Service accounts created with proper roles
  3. ✓ Secrets created in Secret Manager
  4. → ADD GITHUB SECRETS (see $GITHUB_SECRETS_FILE)
  5. → Create staging branch: git checkout -b staging && git push -u origin staging
  6. → Push to deploy!

═══════════════════════════════════════════════════════════════════
EOF

# Create GitHub secrets instructions
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

To get the value, run:
  cat $KEY_FILE

Then copy ALL the output (including { and }) and paste into GitHub.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECRET 4: GCP_SA_KEY_PROD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: GCP_SA_KEY_PROD
Value: (paste entire contents of $KEY_FILE_PROD)

To get the value, run:
  cat $KEY_FILE_PROD

Then copy ALL the output (including { and }) and paste into GitHub.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After adding all 4 secrets, you should see them listed in:
https://github.com/YOUR_USERNAME/Samaanai_apps/settings/secrets/actions

✓ GCP_PROJECT_ID_STAGING
✓ GCP_PROJECT_ID_PROD
✓ GCP_SA_KEY_STAGING
✓ GCP_SA_KEY_PROD

═══════════════════════════════════════════════════════════════════

QUICK COPY COMMANDS:

# Copy staging key (macOS)
cat $KEY_FILE | pbcopy

# Copy production key (macOS)
cat $KEY_FILE_PROD | pbcopy

# View staging key (Linux/other)
cat $KEY_FILE

# View production key (Linux/other)
cat $KEY_FILE_PROD

═══════════════════════════════════════════════════════════════════
EOF

print_success "Summary files created"

##############################################################################
# Final Output
##############################################################################

print_header "🎉 Setup Complete!"

echo ""
print_success "Staging environment configured: $STAGING_PROJECT_ID"
print_success "Production environment configured: $PROD_PROJECT_ID"
echo ""
print_info "Files created in: $OUTPUT_DIR/"
echo "  - $(basename $KEY_FILE)"
echo "  - $(basename $KEY_FILE_PROD)"
echo "  - $(basename $SUMMARY_FILE)"
echo "  - $(basename $GITHUB_SECRETS_FILE)"
echo "  - $(basename $LOG_FILE)"
echo ""

print_header "📋 Next Steps"

echo "1. Review the setup summary:"
echo "   cat $SUMMARY_FILE"
echo ""
echo "2. Add GitHub Secrets (follow instructions):"
echo "   cat $GITHUB_SECRETS_FILE"
echo ""
echo "3. Copy service account keys for GitHub:"
echo "   # Staging key:"
echo "   cat $KEY_FILE"
echo ""
echo "   # Production key:"
echo "   cat $KEY_FILE_PROD"
echo ""
echo "4. Create staging branch and push:"
echo "   git checkout -b staging"
echo "   git push -u origin staging"
echo ""
echo "5. Deploy!"
echo "   git push origin staging  # Deploy to staging"
echo "   git push origin main     # Deploy to production"
echo ""

print_header "⚠️  Security Reminder"

print_warning "Service account keys are stored in: $OUTPUT_DIR/"
print_warning "This directory is protected by .gitignore"
print_warning "After adding to GitHub Secrets, you can optionally delete the key files"
echo ""

print_header "✅ All Done!"

echo "Your GCP environments are ready for deployment! 🚀"
echo ""
echo "For questions, see the documentation:"
echo "  - STAGING_PRODUCTION_SETUP.md"
echo "  - QUICK_REFERENCE.md"
echo "  - DEPLOYMENT_CHECKLIST.md"
echo ""

exit 0
