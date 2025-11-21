# Samaanai Staging Infrastructure

## Overview

Staging environment for testing Samaanai application before production deployment.

## Google Cloud Project

- **Project ID:** `samaanai-stg-1009-124126`
- **Project Number:** `362270100637`
- **Region:** `us-west1` (Oregon)

## Cloud Run Services

### Backend Service
- **Name:** `samaanai-backend-staging`
- **URL:** https://samaanai-backend-staging-362270100637.us-west1.run.app
- **Image:** `gcr.io/samaanai-stg-1009-124126/samaanai-backend-staging:latest`
- **Environment:** staging
- **Min Instances:** 0
- **Max Instances:** 10
- **Memory:** 512Mi
- **CPU:** 1

### Frontend Service
- **Name:** `samaanai-frontend-staging`
- **URL:** https://samaanai-frontend-staging-362270100637.us-west1.run.app
- **Image:** `gcr.io/samaanai-stg-1009-124126/samaanai-frontend-staging:latest`

### n8n Workflow Automation
- **Name:** `n8n-workflow-automation`
- **URL:** https://n8n-workflow-automation-362270100637.us-west1.run.app
- **Image:** `n8nio/n8n:latest`
- **Purpose:** Microsoft To Do → Samaanai task synchronization
- **Database:** Separate PostgreSQL instance (n8n-postgres-instance)

## Database Infrastructure

### Main Application Database

**Cloud SQL Instance:**
- **Instance Name:** `samaanai-prod-postgres` ⚠️ (shared with production)
- **Project:** `samaanai-prod-1009-124126`
- **Database Version:** PostgreSQL 15
- **Region:** `us-west1`
- **Tier:** `db-custom-1-3840` (1 vCPU, 3.75 GB RAM)
- **Private IP:** `10.201.0.3` (VPC-only access)
- **Public IP:** None (disabled for security)

**Staging Database:**
- **Database Name:** `samaanai_staging`
- **Username:** `samaanai_backend`
- **Password:** `sM9K3pWx7nLq2vYt5RzCh8bF4jG`
- **Connection String:** `postgresql://samaanai_backend:sM9K3pWx7nLq2vYt5RzCh8bF4jG@10.201.0.3:5432/samaanai_staging`

**⚠️ Important:** This database is only accessible from within the VPC. Cannot connect directly from local machine.

### n8n Database

**Cloud SQL Instance:**
- **Instance Name:** `n8n-postgres-instance`
- **Project:** `samaanai-stg-1009-124126`
- **Database Version:** PostgreSQL 15
- **Region:** `us-west1`
- **Database Name:** `n8n`
- **Username:** `n8n`
- **Password:** (stored in DATABASE_URL secret)

## Networking

### VPC Configuration
- **Network:** `default`
- **VPC Connector:** `samaanai-connector` (for Cloud Run → Cloud SQL access)
- **Private IP Range:** `10.201.0.0/16`

### Domain Mapping
- Backend: api.samaanai.com → samaanai-backend-staging (not configured yet)
- Frontend: mobile.samaanai.com → samaanai-frontend-staging (not configured yet)

## Secrets (Secret Manager)

### Backend Secrets
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_CALLBACK_URL` - OAuth callback URL
- `GOOGLE_SUCCESS_REDIRECT` - Web success redirect
- `MOBILE_GOOGLE_SUCCESS_REDIRECT` - Mobile app deep link
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `FROM_EMAIL` - Sender email address
- `APP_NAME` - Application name

### n8n Secrets
- `DATABASE_URL` - n8n PostgreSQL connection
- `N8N_ENCRYPTION_KEY` - Data encryption key
- `N8N_SERVICE_ACCOUNT_PASSWORD` - Service account password
- `USER_PASSWORD_KITTUREDDY` - User password for Microsoft To Do sync (to be added)

## Service Accounts

### GitHub Actions
- **Email:** `github-actions@samaanai-stg-1009-124126.iam.gserviceaccount.com`
- **Roles:**
  - Cloud Run Admin
  - Service Account User
  - Artifact Registry Writer
  - Secret Manager Secret Accessor

### n8n Service Account
- **Email:** `n8n-service-account@samaanai-stg-1009-124126.iam.gserviceaccount.com`
- **Roles:**
  - Secret Manager Secret Accessor
  - Cloud SQL Client

## CI/CD

### GitHub Actions Workflows

**Backend Deployment:**
- **File:** `.github/workflows/deploy-backend-staging.yml`
- **Trigger:** Push to `staging` branch (backend-express/**)
- **Steps:**
  1. Build Docker image
  2. Push to Artifact Registry
  3. Deploy to Cloud Run (us-west1)
  4. Run database migrations

**Frontend Deployment:**
- **File:** `.github/workflows/deploy-frontend-staging.yml`
- **Trigger:** Push to `staging` branch (samaanai-frontend/**)
- **Steps:**
  1. Build Next.js application
  2. Build Docker image
  3. Deploy to Cloud Run (us-west1)

## Database Access

### From Local Machine
❌ **Not Possible** - Database has no public IP

### From Cloud Run Services
✅ **Automatic** - Services connect via private VPC

### For Manual Access

**Option 1: Google Cloud Console**
1. Go to Cloud SQL instances
2. Open `samaanai-prod-postgres`
3. Use Cloud SQL Studio to connect to `samaanai_staging` database

**Option 2: Cloud Shell**
```bash
gcloud sql connect samaanai-prod-postgres \
  --user=samaanai_backend \
  --database=samaanai_staging \
  --project=samaanai-prod-1009-124126
```

**Option 3: Temporary Public IP (Not Recommended)**
```bash
# Enable public IP
gcloud sql instances patch samaanai-prod-postgres \
  --project=samaanai-prod-1009-124126 \
  --assign-ip

# Then use Cloud SQL Proxy
cloud-sql-proxy samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres

# Don't forget to remove public IP when done!
```

## Monitoring & Logs

### Cloud Run Logs
```bash
# Backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=samaanai-backend-staging" \
  --project=samaanai-stg-1009-124126 \
  --limit=50

# n8n logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=n8n-workflow-automation" \
  --project=samaanai-stg-1009-124126 \
  --limit=50
```

### Database Logs
```bash
gcloud logging read "resource.type=cloudsql_database" \
  --project=samaanai-prod-1009-124126 \
  --limit=50
```

## Cost Optimization

- Cloud Run scales to zero when not in use
- Database instance shared with production
- Secrets cached by Cloud Run to reduce API calls
- Container images stored in Artifact Registry with lifecycle policies

## Security

- All services use HTTPS only
- Database accessible only via private VPC
- Secrets stored in Secret Manager (encrypted)
- Service accounts follow least-privilege principle
- No public IPs on database instances
- OAuth tokens stored securely

## Troubleshooting

### Backend not deploying
- Check GitHub Actions logs
- Verify secrets are set correctly
- Check Cloud Run service logs

### Database connection issues
- Verify VPC connector is working
- Check DATABASE_URL secret value
- Ensure service has Cloud SQL Client role

### OAuth not working
- Verify callback URLs match in Google Console
- Check GOOGLE_* secrets are current
- Test redirect URLs

## Related Documentation

- [Production Infrastructure](./PRODUCTION_INFRASTRUCTURE.md)
- [Database Access Info](../../DATABASE_ACCESS_INFO.md)
- [n8n Setup](../../N8N_WORKFLOW_SETUP.md)
- [Microsoft To Do Integration](../../MICROSOFT_TODO_INTEGRATION.md)
