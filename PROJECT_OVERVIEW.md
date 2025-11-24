# Samaanai Project Overview

**Last Updated:** November 20, 2025
**Owner:** Krishna Yadamakanti (kittureddy2000@gmail.com)

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Product Features](#product-features)
3. [Infrastructure & Cloud Services](#infrastructure--cloud-services)
4. [GitHub Workflow & Deployment](#github-workflow--deployment)
5. [Testing & Quality Assurance](#testing--quality-assurance)
6. [Database Schema](#database-schema)
7. [Local Development Setup](#local-development-setup)
8. [Monitoring & Operations](#monitoring--operations)

---

## Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **ORM:** Prisma (PostgreSQL)
- **Authentication:**
  - Passport.js (Local strategy + Google OAuth 2.0)
  - JWT tokens for API access
  - Microsoft OAuth 2.0 for To Do integration
- **APIs & Integrations:**
  - Microsoft Graph API (To Do tasks)
  - SendGrid (email notifications via SMTP)
- **Validation:** Joi
- **Container:** Docker (multi-stage builds)

### Frontend
- **Framework:** React Native with Expo SDK
- **UI Library:** React Native Paper
- **Navigation:** React Navigation
- **State Management:** React Context API
- **HTTP Client:** Axios
- **Platforms:** iOS, Android, Web (universal app)

### Database
- **Engine:** PostgreSQL 15
- **Development:** Local via Docker or Cloud SQL Proxy
- **Production:** Google Cloud SQL (private IP only)
- **ORM:** Prisma with code-first migrationsist

### DevOps & Cloud
- **Platform:** Google Cloud Platform (GCP)
  - **Cloud Run:** Serverless containers for backend/frontend
  - **Cloud SQL:** Managed PostgreSQL with VPC networking
  - **Secret Manager:** Secure credential storage
  - **Artifact Registry:** Docker image repository
  - **VPC Networking:** Private database connectivity
- **CI/CD:** GitHub Actions (automated testing & deployment)
- **Mobile Builds:** Expo Application Services (EAS)
- **Monitoring:** GCP Cloud Logging & Cloud Monitoring

---

## Product Features

### 1. Nutrition Tracking
**Purpose:** Help users track their daily nutrition intake and fitness activities

**Features:**
- Daily calorie and macronutrient tracking (protein, carbs, fat)
- Meal logging by type (breakfast, lunch, dinner, snacks)
- Exercise and activity tracking with calories burned
- Daily nutrition reports and progress monitoring
- Goal setting and achievement tracking
- Historical data and trends

**Technical Implementation:**
- REST API endpoints: `/api/v1/nutrition/*`
- Database: `Meal`, `Exercise`, `NutritionGoal` tables
- Mobile app: Dedicated screens for meal logging and reports

### 2. Task Management
**Purpose:** Organize personal tasks and todos

**Features:**
- Create and organize tasks with due dates
- Task completion tracking
- Statistics dashboard (completed vs pending)
- Image attachments support
- Integration with Microsoft To Do (Phase 1 complete)

**Technical Implementation:**
- REST API endpoints: `/api/v1/todo/*`
- Database: `Task` table with `microsoftTodoId` for sync
- Mobile app: Task list screens with filters

### 3. Microsoft To Do Integration
**Purpose:** Sync tasks between Samaanai and Microsoft To Do

**Status:** Phase 1 Implementation Complete (deployed to staging)

**Features:**
- OAuth 2.0 authentication with Microsoft
- One-way sync: Microsoft To Do → Samaanai
- Manual sync trigger via API
- Connection status tracking
- Secure token storage with refresh capability

**Technical Implementation:**
- REST API endpoints: `/api/v1/integrations/microsoft/*`
- OAuth flow using @azure/msal-node
- Microsoft Graph API integration
- Database: `Integration` table stores access/refresh tokens
- Services: `microsoftOAuthService`, `microsoftGraphService`, `taskSyncService`

**Future Enhancements (Phase 2):**
- Two-way sync (Samaanai → Microsoft To Do)
- Webhook support for real-time updates
- Automatic background sync

### 4. Authentication & Security
**Features:**
- Email/password registration and login
- Google OAuth integration (web + mobile deep linking)
- JWT-based secure sessions (7-day access, 30-day refresh)
- Password reset functionality
- Secure credential storage in GCP Secret Manager

---

## Infrastructure & Cloud Services

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  USERS / CLIENTS                         │
│  • Mobile Apps (iOS/Android via Expo)                   │
│  • Web App (React)                                       │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS/REST API
                 ▼
┌─────────────────────────────────────────────────────────┐
│             GOOGLE CLOUD RUN (Serverless)               │
│  • samaanai-backend (Express.js API)                    │
│  • samaanai-frontend (React/Nginx)                      │
│  • Auto-scaling, VPC-connected                          │
└────────────────┬────────────────────────────────────────┘
                 │ Private VPC Network
                 ▼
┌─────────────────────────────────────────────────────────┐
│           GOOGLE CLOUD SQL (PostgreSQL 15)              │
│  • Private IP only (no public exposure)                 │
│  • samaanai_staging database (staging)                  │
│  • samaanai database (production)                       │
└─────────────────────────────────────────────────────────┘
```

### Staging Environment

**GCP Project:** `samaanai-stg-1009-124126` (Project #362270100637)
**Region:** us-west1 (Oregon)

**Services:**
- **Backend API:** `https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app`
- **Frontend:** `https://samaanai-frontend-staging-362270100637.us-west1.run.app`

**Database:**
- **Instance:** `samaanai-backend-staging-db`
- **Type:** Cloud SQL PostgreSQL 15, db-f1-micro (0.6 GB RAM)
- **Database:** `samaanai_staging`
- **Private IP:** 10.201.0.5
- **Connection:** Via VPC connector `n8n-vpc-connector`
- **User:** `samaanai_backend`
- **Backups:** Manual only (cost optimization)

**Networking:**
- **VPC:** `n8n-network` (10.10.0.0/24)
- **VPC Connector:** `n8n-vpc-connector` (10.11.0.0/28, f1-micro)
- **Cloud Run:** Connected to VPC for private database access

**Cost:** ~$35-50/month (optimized for development)

### Production Environment

**GCP Project:** `samaanai-prod-1009-124126` (Project #172298808029)
**Region:** us-west1 (Oregon)

**Services:**
- **Backend API:** `https://samaanai-backend-172298808029.us-west1.run.app`
- **Frontend:** `https://samaanai-frontend-172298808029.us-west1.run.app`

**Database:**
- **Instance:** `samaanai-prod-postgres`
- **Type:** Cloud SQL PostgreSQL 15, db-f1-micro (0.6 GB RAM)
- **Database:** `samaanai`
- **Private IP:** 10.119.0.3
- **Connection:** Via VPC connector `samaanai-prod-connector`
- **User:** `postgres`
- **Backups:** Manual recommended before major changes

**Networking:**
- **VPC:** `samaanai-prod-vpc` (10.20.0.0/24)
- **VPC Connector:** `samaanai-prod-connector` (10.21.0.0/28, f1-micro)
- **Cloud Run:** Min 1 instance (always warm), max 100 instances

**Cost:** ~$57-87/month (optimized for single-user production)

**Security Features:**
- Database has NO public IP (VPC-only access)
- All secrets in GCP Secret Manager
- HTTPS-only endpoints (automatic SSL via Cloud Run)
- JWT authentication on all protected endpoints

---

## GitHub Workflow & Deployment

### Repository Structure

```
Samaanai_apps/
├── backend-express/           # Express.js API Server
│   ├── src/
│   │   ├── config/           # Passport, database config
│   │   ├── controllers/      # Route controllers
│   │   ├── services/         # Business logic (OAuth, Graph API, sync)
│   │   ├── middleware/       # Auth, error handling
│   │   ├── routes/           # API endpoints
│   │   └── server.js         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # Migration history
│   ├── Dockerfile            # Production container
│   └── package.json
│
├── samaanai-mobile/          # React Native Universal App
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts (Auth)
│   │   ├── navigation/       # App navigation
│   │   ├── screens/          # App screens
│   │   └── services/         # API client
│   ├── app.config.js         # Expo configuration
│   ├── eas.json             # EAS Build profiles
│   └── package.json
│
└── .github/workflows/        # CI/CD Pipelines
    └── deploy-backend-staging-prod.yml
```

### Branch Strategy

**Two-environment workflow with branch protection:**

```
main (production)
  ├─ Protected: Requires Pull Request
  ├─ Requires: 1 approval
  ├─ Auto-deploys to: Production (samaanai-prod-1009-124126)
  └─ Deployment: Triggers on merge to main

staging (pre-production)
  ├─ Direct push allowed (fast iteration)
  ├─ Auto-deploys to: Staging (samaanai-stg-1009-124126)
  └─ Deployment: Triggers on push to staging
```

### Deployment Workflow

#### Staging Deployment (Direct Push)

**Daily Development Flow:**
```bash
# Work on staging branch
git checkout staging
git pull origin staging

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push directly - triggers auto-deployment
git push origin staging

# Monitor deployment
gh run list --branch staging
gh run watch
```

**What Happens Automatically:**
1. GitHub Actions detects push to `staging`
2. Runs tests (if configured)
3. Builds Docker image with commit SHA tag
4. Pushes image to GCP Artifact Registry
5. Deploys to Cloud Run staging service
6. Runs Prisma migrations on staging database
7. Health check verification
8. Deployment complete (~3-5 minutes)

#### Production Deployment (Pull Request Required)

**Production Release Flow:**
```bash
# After staging has been tested for a few days
git checkout staging
git pull origin staging

# Create Pull Request to main
gh pr create --base main --head staging \
  --title "Production Release - [Date]" \
  --body "### Changes
- Feature 1
- Bug fix 2
- Performance improvement

### Testing
- Tested in staging for X days
- All tests passing
- Manual QA complete"

# Review PR on GitHub UI
# Approve PR (required by branch protection)
# Merge PR

# After merge, GitHub Actions auto-deploys to production
gh run list --branch main
```

**Why This Workflow?**
- **Staging (no PR):** Fast iteration, safe experimentation
- **Production (PR required):** Forced review, audit trail, prevents accidental deployments

### GitHub Actions Workflow

**File:** `.github/workflows/deploy-backend-staging-prod.yml`

**Triggered by:**
- Push to `staging` branch → Deploy to staging
- Push to `main` branch → Deploy to production

**Steps:**
1. Checkout code
2. Authenticate to Google Cloud
3. Build Docker image (`gcr.io/PROJECT_ID/samaanai-backend:COMMIT_SHA`)
4. Push image to Artifact Registry
5. Deploy to Cloud Run with environment-specific configuration:
   - Environment variables (NODE_ENV, ENVIRONMENT, API URLs)
   - Secrets from Secret Manager (DATABASE_URL, JWT_SECRET, OAuth credentials)
   - VPC connector for database access
   - Region-specific URLs (us-west1)
6. Run database migrations (Prisma)
7. Health check

**Secrets (GitHub):**
- `GCP_STAGING_SA_KEY` - Staging service account JSON key
- `GCP_PRODUCTION_SA_KEY` - Production service account JSON key

**Secrets (GCP Secret Manager):**
- `DATABASE_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`, `GOOGLE_SUCCESS_REDIRECT`
- `MOBILE_GOOGLE_SUCCESS_REDIRECT`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `FROM_EMAIL`, `APP_NAME`

---

## Testing & Quality Assurance

### Testing Strategy

**Staging Environment (staging branch):**
- Purpose: Development, feature testing, integration testing
- Duration: Test new features for 2-3 days minimum
- Process:
  1. Deploy to staging (automatic on push)
  2. Manual testing via mobile app or API
  3. Monitor logs for errors
  4. Verify database migrations
  5. Test OAuth flows and integrations

**Production Environment (main branch):**
- Purpose: Live user data and production traffic
- Deployment: Only after staging validation via PR
- Rollback: Available via Cloud Run revision management

### Manual API Testing

**Test Endpoints:**
```bash
# Login and get token
curl -X POST https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@samaanai.com","password":"test123"}'

# Export TOKEN from response
TOKEN="eyJhbGci..."

# Test Microsoft integration endpoints
curl https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/status \
  -H "Authorization: Bearer $TOKEN"

# Test task sync
curl -X POST https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/sync \
  -H "Authorization: Bearer $TOKEN"
```

### Mobile App Testing

**Expo EAS Build Profiles:**
- **development:** APK for local testing, connects to localhost
- **staging:** Connects to staging backend URL
- **production:** Connects to production backend URL

**Build Commands:**
```bash
cd samaanai-mobile

# Build for staging testing
eas build --platform android --profile staging

# View builds
eas build:list

# Download APK
eas build:download --platform android --latest
```

---

## Database Schema

### Key Tables

**Authentication:**
- `auth_user` - User accounts (email, password, OAuth)
- `auth_session` - JWT refresh tokens

**Nutrition:**
- `Meal` - Logged meals with nutritional info
- `Exercise` - Exercise activities
- `NutritionGoal` - User nutrition goals

**Tasks:**
- `Task` - Todo items with optional `microsoftTodoId` for sync

**Integrations:**
- `Integration` - OAuth tokens for third-party services (Microsoft)
  - Fields: `user_id`, `provider`, `access_token`, `refresh_token`, `expires_at`

### Migrations

**Location:** `backend-express/prisma/migrations/`

**Running Migrations:**

**Local Development:**
```bash
cd backend-express
npx prisma migrate dev --name description_of_change
```

**Production (via Cloud SQL Proxy):**
```bash
# Start proxy
./cloud-sql-proxy samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres --port 5432 &

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/samaanai?host=/cloudsql/..."

# Deploy migrations (no edits, just apply)
npx prisma migrate deploy
```

**Important Notes:**
- Migrations auto-run during GitHub Actions deployment
- Always test migrations in staging first
- Backup production database before schema changes

---

## Local Development Setup

### Prerequisites
- Docker Desktop OR Node.js 18+, PostgreSQL 15+
- Google Cloud SDK (`gcloud` CLI)
- Cloud SQL Proxy for database access

### Quick Start (Docker)

```bash
# Clone repository
git clone https://github.com/kittureddy2000/Samaanai_apps.git
cd Samaanai_apps

# Start services
docker-compose up -d --build

# Access
# Backend API: http://localhost:8080
# Mobile Web: http://localhost:19006
```

### Backend Local Development

**Option 1: Connect to Staging Cloud SQL**

```bash
cd backend-express

# Download Cloud SQL Proxy (macOS)
curl -o cloud-sql-proxy \
  https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy

# Start proxy (staging database)
./cloud-sql-proxy samaanai-stg-1009-124126:us-west1:samaanai-backend-staging-db --port 5440

# Update .env
DATABASE_URL=postgresql://samaanai_backend:PASSWORD@localhost:5440/samaanai_staging

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

**Option 2: Local PostgreSQL (Docker)**

```bash
# Use docker-compose (see repository)
docker-compose up postgres -d

# Update .env to use localhost:5432
DATABASE_URL=postgresql://postgres:password@localhost:5432/samaanai

# Run migrations
npx prisma migrate dev
```

### Mobile App Local Development

```bash
cd samaanai-mobile

# Install dependencies
npm install

# Start Expo
npx expo start

# Options:
# - Press 'w' for web
# - Scan QR code for mobile device
# - Press 'i' for iOS simulator (Mac only)
# - Press 'a' for Android emulator
```

### Environment Variables

**Backend (.env):**
See `backend-express/.env.example` for template

**Mobile (.env):**
```bash
API_BASE_URL=http://localhost:8080  # Or staging URL for testing
```

---

## Monitoring & Operations

### View Logs

**Staging Logs:**
```bash
# Backend
gcloud run services logs read samaanai-backend-staging \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126 \
  --limit=50 \
  --follow

# Filter errors
gcloud run services logs read samaanai-backend-staging \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126 | grep -i error
```

**Production Logs:**
```bash
gcloud run services logs read samaanai-backend \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126 \
  --limit=50
```

### Database Access

**Cloud SQL Proxy (Local Access):**
```bash
# Staging
./cloud-sql-proxy samaanai-stg-1009-124126:us-west1:samaanai-backend-staging-db --port 5440
PGPASSWORD=PASSWORD psql -h localhost -p 5440 -U samaanai_backend -d samaanai_staging

# Production
./cloud-sql-proxy samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres --port 5432
PGPASSWORD=PASSWORD psql -h localhost -p 5432 -U postgres -d samaanai
```

### Manual Backups

**Critical: Production database has no automated backups**

```bash
# Backup production database
gcloud sql export sql samaanai-prod-postgres \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/prod/samaanai-$(date +%Y%m%d).sql \
  --database=samaanai \
  --project=samaanai-prod-1009-124126

# Restore from backup
gcloud sql import sql samaanai-prod-postgres \
  gs://BUCKET/BACKUP_FILE.sql \
  --database=samaanai \
  --project=samaanai-prod-1009-124126
```

**Recommended Backup Schedule:**
- Before major deployments
- Weekly (e.g., every Sunday)
- Before database schema changes

### Rollback Deployment

```bash
# List recent revisions
gcloud run revisions list \
  --service=samaanai-backend \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126

# Rollback to previous revision
gcloud run services update-traffic samaanai-backend \
  --to-revisions=REVISION_NAME=100 \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126
```

### Updating Secrets

```bash
# Update any secret in GCP Secret Manager
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME \
  --data-file=- \
  --project=samaanai-stg-1009-124126

# Example: Update Microsoft client secret
echo -n "new-microsoft-client-secret" | gcloud secrets versions add MICROSOFT_CLIENT_SECRET \
  --data-file=- \
  --project=samaanai-stg-1009-124126

# Redeploy service to pick up new secret
gcloud run services update samaanai-backend-staging \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126
```

---

## Project Status & Roadmap

### Completed Features
- User authentication (email/password + Google OAuth)
- Nutrition tracking (meals, exercises, goals)
- Task management (basic CRUD)
- Microsoft To Do integration (Phase 1 - one-way sync)
- Infrastructure migration to us-west1 with VPC networking
- CI/CD pipeline with staging/production environments
- Mobile app with Expo (iOS, Android, Web)

### In Progress
- Testing Microsoft To Do integration in staging environment

### Planned Enhancements
- Microsoft To Do Phase 2: Two-way sync, webhooks, auto-sync
- Custom domain mapping (api.samaanai.com)
- Automated database backups (if scaling to multiple users)
- Enhanced monitoring and alerting
- Mobile app submission to App Store / Play Store
- Additional task integrations (Google Tasks, Todoist)

---

**Document Version:** 1.0
**Last Updated:** November 20, 2025
**Next Review:** December 20, 2025
