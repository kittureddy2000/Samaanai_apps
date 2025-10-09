#!/bin/bash

##############################################################################
# Cloud SQL PostgreSQL Setup for Staging and Production
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

generate_password() {
    openssl rand -base64 32 | tr -d '/+=' | head -c 32
}

print_header "🐘 Cloud SQL PostgreSQL Setup"

# Project IDs from previous setup
STAGING_PROJECT_ID="samaanai-stg-1009-124126"
PROD_PROJECT_ID="samaanai-prod-1009-124126"
GCP_REGION="us-central1"

print_info "Setting up PostgreSQL databases for:"
print_info "  Staging: $STAGING_PROJECT_ID"
print_info "  Production: $PROD_PROJECT_ID"
echo ""

##############################################################################
# Setup Staging Database
##############################################################################

print_header "🧪 Creating Staging Database"

gcloud config set project "$STAGING_PROJECT_ID"

# Enable required APIs
print_info "Enabling required APIs..."
gcloud services enable sqladmin.googleapis.com --project="$STAGING_PROJECT_ID" --quiet
gcloud services enable servicenetworking.googleapis.com --project="$STAGING_PROJECT_ID" --quiet
gcloud services enable compute.googleapis.com --project="$STAGING_PROJECT_ID" --quiet
print_success "Required APIs enabled"

# Generate database password
STAGING_DB_PASSWORD=$(generate_password)

# Create Cloud SQL instance
STAGING_INSTANCE_NAME="samaanai-staging-db"
print_info "Creating Cloud SQL instance: $STAGING_INSTANCE_NAME (this may take 5-10 minutes)..."

if gcloud sql instances describe "$STAGING_INSTANCE_NAME" --project="$STAGING_PROJECT_ID" &> /dev/null; then
    print_info "Instance already exists, skipping creation"
else
    gcloud sql instances create "$STAGING_INSTANCE_NAME" \
        --project="$STAGING_PROJECT_ID" \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region="$GCP_REGION" \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --backup-start-time=03:00 \
        --database-flags=max_connections=100

    print_success "Cloud SQL instance created"
fi

# Set root password
print_info "Setting database root password..."
gcloud sql users set-password postgres \
    --instance="$STAGING_INSTANCE_NAME" \
    --password="$STAGING_DB_PASSWORD" \
    --project="$STAGING_PROJECT_ID"
print_success "Root password set"

# Create database
print_info "Creating database: samaanai_staging..."
if gcloud sql databases describe samaanai_staging --instance="$STAGING_INSTANCE_NAME" --project="$STAGING_PROJECT_ID" &> /dev/null; then
    print_info "Database already exists"
else
    gcloud sql databases create samaanai_staging \
        --instance="$STAGING_INSTANCE_NAME" \
        --project="$STAGING_PROJECT_ID"
    print_success "Database created"
fi

# Get connection name
STAGING_CONNECTION_NAME=$(gcloud sql instances describe "$STAGING_INSTANCE_NAME" \
    --project="$STAGING_PROJECT_ID" \
    --format="value(connectionName)")

# Build DATABASE_URL
STAGING_DB_URL="postgresql://postgres:${STAGING_DB_PASSWORD}@localhost/samaanai_staging?host=/cloudsql/${STAGING_CONNECTION_NAME}"

# Update DATABASE_URL secret
print_info "Updating DATABASE_URL secret..."
echo -n "$STAGING_DB_URL" | gcloud secrets versions add DATABASE_URL \
    --project="$STAGING_PROJECT_ID" \
    --data-file=-
print_success "DATABASE_URL secret updated"

print_success "Staging database ready!"

##############################################################################
# Setup Production Database
##############################################################################

print_header "🚀 Creating Production Database"

gcloud config set project "$PROD_PROJECT_ID"

# Enable required APIs
print_info "Enabling required APIs..."
gcloud services enable sqladmin.googleapis.com --project="$PROD_PROJECT_ID" --quiet
gcloud services enable servicenetworking.googleapis.com --project="$PROD_PROJECT_ID" --quiet
gcloud services enable compute.googleapis.com --project="$PROD_PROJECT_ID" --quiet
print_success "Required APIs enabled"

# Generate database password (DIFFERENT from staging!)
PROD_DB_PASSWORD=$(generate_password)

# Create Cloud SQL instance
PROD_INSTANCE_NAME="samaanai-production-db"
print_info "Creating Cloud SQL instance: $PROD_INSTANCE_NAME (this may take 5-10 minutes)..."

if gcloud sql instances describe "$PROD_INSTANCE_NAME" --project="$PROD_PROJECT_ID" &> /dev/null; then
    print_info "Instance already exists, skipping creation"
else
    gcloud sql instances create "$PROD_INSTANCE_NAME" \
        --project="$PROD_PROJECT_ID" \
        --database-version=POSTGRES_15 \
        --tier=db-g1-small \
        --region="$GCP_REGION" \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --backup-start-time=03:00 \
        --availability-type=ZONAL \
        --database-flags=max_connections=100

    print_success "Cloud SQL instance created"
fi

# Set root password
print_info "Setting database root password..."
gcloud sql users set-password postgres \
    --instance="$PROD_INSTANCE_NAME" \
    --password="$PROD_DB_PASSWORD" \
    --project="$PROD_PROJECT_ID"
print_success "Root password set"

# Create database
print_info "Creating database: samaanai..."
if gcloud sql databases describe samaanai --instance="$PROD_INSTANCE_NAME" --project="$PROD_PROJECT_ID" &> /dev/null; then
    print_info "Database already exists"
else
    gcloud sql databases create samaanai \
        --instance="$PROD_INSTANCE_NAME" \
        --project="$PROD_PROJECT_ID"
    print_success "Database created"
fi

# Get connection name
PROD_CONNECTION_NAME=$(gcloud sql instances describe "$PROD_INSTANCE_NAME" \
    --project="$PROD_PROJECT_ID" \
    --format="value(connectionName)")

# Build DATABASE_URL
PROD_DB_URL="postgresql://postgres:${PROD_DB_PASSWORD}@localhost/samaanai?host=/cloudsql/${PROD_CONNECTION_NAME}"

# Update DATABASE_URL secret
print_info "Updating DATABASE_URL secret..."
echo -n "$PROD_DB_URL" | gcloud secrets versions add DATABASE_URL \
    --project="$PROD_PROJECT_ID" \
    --data-file=-
print_success "DATABASE_URL secret updated"

print_success "Production database ready!"

##############################################################################
# Save credentials
##############################################################################

print_header "💾 Saving Database Credentials"

DB_CREDS_FILE="$OUTPUT_DIR/DATABASE_CREDENTIALS.txt"

cat > "$DB_CREDS_FILE" << EOF
═══════════════════════════════════════════════════════════════════
  Cloud SQL Database Credentials
═══════════════════════════════════════════════════════════════════

⚠️  KEEP THESE CREDENTIALS SECURE! ⚠️

STAGING DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Instance Name:     $STAGING_INSTANCE_NAME
  Connection Name:   $STAGING_CONNECTION_NAME
  Database:          samaanai_staging
  User:              postgres
  Password:          $STAGING_DB_PASSWORD

  DATABASE_URL:      $STAGING_DB_URL

PRODUCTION DATABASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Instance Name:     $PROD_INSTANCE_NAME
  Connection Name:   $PROD_CONNECTION_NAME
  Database:          samaanai
  User:              postgres
  Password:          $PROD_DB_PASSWORD

  DATABASE_URL:      $PROD_DB_URL

CLOUD RUN CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your Cloud Run services will automatically connect to these databases
using Cloud SQL Proxy via Unix sockets.

The DATABASE_URL secrets have been updated in Secret Manager.

IMPORTANT NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Cloud Run connects via Cloud SQL Proxy automatically
✓ Automated backups at 3:00 AM daily
✓ Storage auto-increases as needed
✓ Staging: db-f1-micro (shared core, cost-effective)
✓ Production: db-g1-small (1 vCPU, 1.7 GB RAM)

ESTIMATED MONTHLY COSTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Staging:    ~\$10-15/month (db-f1-micro)
  Production: ~\$25-35/month (db-g1-small)

═══════════════════════════════════════════════════════════════════
EOF

chmod 600 "$DB_CREDS_FILE"
print_success "Credentials saved to: $DB_CREDS_FILE"

print_header "🎉 Database Setup Complete!"

echo ""
print_success "Staging Database: $STAGING_INSTANCE_NAME"
print_success "Production Database: $PROD_INSTANCE_NAME"
echo ""
print_info "Next steps:"
echo "  1. cat $DB_CREDS_FILE"
echo "  2. Your DATABASE_URL secrets have been automatically updated"
echo "  3. Cloud Run will connect automatically via Cloud SQL Proxy"
echo ""
print_warning "Keep $DB_CREDS_FILE secure - it contains database passwords!"
echo ""

exit 0
