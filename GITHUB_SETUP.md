# GitHub Repository & Cloud Run Deployment Setup

Complete guide to set up GitHub repository and automated deployment to Google Cloud Run.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Repository Setup](#github-repository-setup)
3. [Google Cloud Setup](#google-cloud-setup)
4. [GitHub Secrets Configuration](#github-secrets-configuration)
5. [First Deployment](#first-deployment)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- ✅ Git installed locally
- ✅ GitHub account
- ✅ Google Cloud Platform (GCP) account
- ✅ `gcloud` CLI installed and configured
- ✅ Docker installed (optional, for local testing)

## GitHub Repository Setup

### 1. Create a New GitHub Repository

```bash
# Go to GitHub.com and create a new repository
# Repository name: Samaanai_apps (or your preferred name)
# Visibility: Private (recommended) or Public
# DO NOT initialize with README (we already have one)
```

### 2. Initialize Local Git Repository

```bash
# Navigate to project directory
cd /Users/krishnayadamakanti/Documents/Samaanai_apps

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Samaanai nutrition and task management app

- Express.js backend with Prisma ORM
- React Native (Expo) mobile app
- Docker support for development and production
- GitHub Actions workflow for Cloud Run deployment
- Complete documentation for setup and deployment"

# Add remote repository (replace with your GitHub URL)
git remote add origin https://github.com/YOUR_USERNAME/Samaanai_apps.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Google Cloud Setup

### 1. Create or Select a Project

```bash
# Create a new project
gcloud projects create samaanai-prod --name="Samaanai Production"

# Or use existing project
# List your projects
gcloud projects list

# Set active project
gcloud config set project samaanai-prod
```

### 2. Enable Required APIs

```bash
# Enable Cloud Run API
gcloud services enable run.googleapis.com

# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Enable Container Registry API
gcloud services enable containerregistry.googleapis.com

# Enable Artifact Registry API (recommended over GCR)
gcloud services enable artifactregistry.googleapis.com

# Enable Cloud SQL API (if using Cloud SQL)
gcloud services enable sqladmin.googleapis.com
```

### 3. Create Service Account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployment" \
  --description="Service account for automated deployments from GitHub Actions"

# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant necessary roles to the service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download service account key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# IMPORTANT: This creates github-actions-key.json in your current directory
# Keep this file secure and DO NOT commit it to git
```

### 4. Create Secrets in Google Secret Manager

```bash
# Navigate to backend directory
cd backend-express

# Create DATABASE_URL secret
echo -n "postgresql://username:password@host:5432/database" | \
  gcloud secrets create DATABASE_URL --data-file=-

# Create JWT_SECRET (generate a strong secret)
openssl rand -base64 32 | tr -d '\n' | \
  gcloud secrets create JWT_SECRET --data-file=-

# Create JWT_REFRESH_SECRET
openssl rand -base64 32 | tr -d '\n' | \
  gcloud secrets create JWT_REFRESH_SECRET --data-file=-

# Create GOOGLE_CLIENT_ID (if using Google OAuth)
echo -n "your-google-client-id" | \
  gcloud secrets create GOOGLE_CLIENT_ID --data-file=-

# Create GOOGLE_CLIENT_SECRET
echo -n "your-google-client-secret" | \
  gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-

# Verify secrets were created
gcloud secrets list
```

### 5. Set Up Cloud SQL (Recommended for Production)

```bash
# Create Cloud SQL instance
gcloud sql instances create samaanai-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=3

# Set root password
gcloud sql users set-password postgres \
  --instance=samaanai-db \
  --password=$(openssl rand -base64 32)

# Create application database
gcloud sql databases create samaanai \
  --instance=samaanai-db

# Create application user
gcloud sql users create samaanai_user \
  --instance=samaanai-db \
  --password=$(openssl rand -base64 32)

# Get connection name
gcloud sql instances describe samaanai-db --format='value(connectionName)'
# Output: PROJECT_ID:us-central1:samaanai-db

# Update DATABASE_URL secret with Cloud SQL connection
echo -n "postgresql://samaanai_user:PASSWORD@/samaanai?host=/cloudsql/PROJECT_ID:us-central1:samaanai-db" | \
  gcloud secrets versions add DATABASE_URL --data-file=-
```

**Alternative: External Database (e.g., Neon, Supabase)**

```bash
# If using external PostgreSQL database
echo -n "postgresql://user:password@host:5432/database?sslmode=require" | \
  gcloud secrets create DATABASE_URL --data-file=-
```

## GitHub Secrets Configuration

### 1. Add Secrets to GitHub Repository

Go to your GitHub repository:

```
https://github.com/YOUR_USERNAME/Samaanai_apps/settings/secrets/actions
```

Click **"New repository secret"** and add the following:

#### GCP_PROJECT_ID

```
Name: GCP_PROJECT_ID
Value: samaanai-prod
```

#### GCP_SA_KEY

```
Name: GCP_SA_KEY
Value: (paste entire contents of github-actions-key.json)
```

To get the contents:

```bash
# On macOS/Linux
cat github-actions-key.json | pbcopy  # macOS
cat github-actions-key.json           # Linux (copy output)

# Or display it
cat github-actions-key.json
```

### 2. Verify Secrets

After adding secrets, you should see:

- ✅ `GCP_PROJECT_ID`
- ✅ `GCP_SA_KEY`

## First Deployment

### 1. Trigger Deployment

The GitHub Actions workflow will automatically run when you:

- Push to `main` or `staging` branch
- Modify files in `backend-express/` directory
- Manually trigger the workflow

**Option A: Push Changes**

```bash
# Make a small change
echo "# Deployed" >> README.md

# Commit and push
git add .
git commit -m "Deploy backend to Cloud Run"
git push origin main
```

**Option B: Manual Trigger**

1. Go to `Actions` tab in your GitHub repository
2. Click on `Deploy Backend to Cloud Run`
3. Click `Run workflow` → `Run workflow`

### 2. Monitor Deployment

1. Go to GitHub repository → `Actions` tab
2. Click on the running workflow
3. Monitor the steps:
   - ✅ Run Tests
   - ✅ Build and Deploy to Cloud Run
   - ✅ Build Docker Image
   - ✅ Push Docker Image
   - ✅ Deploy to Cloud Run
   - ✅ Run Database Migrations
   - ✅ Get Service URL
   - ✅ Health Check

### 3. Get Service URL

After successful deployment, you'll see:

```
Backend deployed to: https://samaanai-backend-xxxxx.run.app
```

## Verification

### 1. Test the Deployed API

```bash
# Set service URL (from deployment output)
SERVICE_URL="https://samaanai-backend-xxxxx.run.app"

# Test health endpoint
curl $SERVICE_URL/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-05T..."}

# Test API info endpoint
curl $SERVICE_URL/api/v1

# Test authentication endpoint (should return 401 or error for missing credentials)
curl $SERVICE_URL/api/v1/auth/login
```

### 2. Check Cloud Run Service

```bash
# List Cloud Run services
gcloud run services list

# Describe service
gcloud run services describe samaanai-backend --region us-central1

# View logs
gcloud run services logs read samaanai-backend --region us-central1 --limit 50

# Tail logs in real-time
gcloud run services logs tail samaanai-backend --region us-central1
```

### 3. Test Database Connection

```bash
# If using Cloud SQL, connect to verify migrations ran
gcloud sql connect samaanai-db --user=postgres

# In psql shell
\c samaanai
\dt
# Should show tables created by Prisma migrations
\q
```

## Environment Variables in Cloud Run

The GitHub Actions workflow automatically sets these:

### Environment Variables
- `NODE_ENV=production`
- `PORT=8080`

### Secrets (from Secret Manager)
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Updating Deployment

### 1. Update Code

```bash
# Make your changes
vim backend-express/src/routes/auth.js

# Commit and push
git add .
git commit -m "feat: add new authentication endpoint"
git push origin main
```

### 2. Automatic Deployment

GitHub Actions will automatically:
1. Run tests
2. Build new Docker image
3. Push to Container Registry
4. Deploy to Cloud Run
5. Run migrations
6. Perform health check

### 3. Rollback (if needed)

```bash
# List revisions
gcloud run revisions list --service samaanai-backend --region us-central1

# Rollback to previous revision
gcloud run services update-traffic samaanai-backend \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

## Troubleshooting

### GitHub Actions Fails: "Permission Denied"

**Solution:** Verify service account has required roles

```bash
PROJECT_ID=$(gcloud config get-value project)

gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
```

### GitHub Actions Fails: "Secret not found"

**Solution:** Verify secrets exist in Secret Manager

```bash
# List all secrets
gcloud secrets list

# Create missing secret
echo -n "your-secret-value" | gcloud secrets create SECRET_NAME --data-file=-
```

### Deployment Fails: "Cloud SQL connection failed"

**Solution:** Update Cloud Run to use Cloud SQL connector

```bash
# The workflow already includes --add-cloudsql-instances flag
# Verify Cloud SQL instance connection name
gcloud sql instances describe samaanai-db --format='value(connectionName)'
```

### Health Check Fails

**Solution:** Verify health endpoint exists

```bash
# Check if health endpoint is implemented
curl https://samaanai-backend-xxxxx.run.app/health

# If not, add to backend-express/src/server.js:
# app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))
```

### Tests Fail in CI

**Solution:** Ensure test database is properly configured

The workflow uses:
```yaml
DATABASE_URL: postgresql://test:test@localhost:5432/test_db
```

Make sure your tests can run without a real database or mock database calls.

## Security Best Practices

### ✅ DO

1. **Use Secret Manager** for all sensitive data
2. **Rotate secrets** regularly (every 90 days)
3. **Use least privilege** for service accounts
4. **Enable Cloud Armor** for DDoS protection
5. **Use Cloud SQL Proxy** for database connections
6. **Enable audit logging**
7. **Use environment-specific projects** (dev, staging, prod)

### ❌ DON'T

1. **Never commit** `github-actions-key.json` to git
2. **Never hardcode** secrets in code
3. **Never use** `--allow-unauthenticated` for sensitive APIs (use Cloud Endpoints or API Gateway)
4. **Never share** service account keys
5. **Never use** production credentials in development

## Cost Optimization

### Free Tier Limits (Cloud Run)

- 2 million requests/month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds of compute time

### Recommendations

1. **Set min-instances to 0** (avoid idle charges)
2. **Use appropriate memory** (512Mi for light APIs, 1Gi for heavy)
3. **Enable request timeouts** (avoid runaway processes)
4. **Monitor usage** in Cloud Console

```bash
# View Cloud Run pricing estimation
gcloud run services describe samaanai-backend \
  --region us-central1 \
  --format='value(status.url,spec.template.spec.containers[0].resources)'
```

## Monitoring & Alerts

### Set Up Alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate - Samaanai Backend" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=60s
```

### View Metrics

1. Go to [Cloud Console](https://console.cloud.google.com)
2. Navigate to **Cloud Run** → **samaanai-backend**
3. Click **Metrics** tab
4. Monitor:
   - Request count
   - Request latency
   - Container instance count
   - Billable container instance time

## Additional Resources

- **Cloud Run Documentation:** https://cloud.google.com/run/docs
- **GitHub Actions:** https://docs.github.com/actions
- **Secret Manager:** https://cloud.google.com/secret-manager/docs
- **Cloud SQL:** https://cloud.google.com/sql/docs
- **Prisma Migrations:** https://www.prisma.io/docs/concepts/components/prisma-migrate

## Support

For issues specific to:
- **Samaanai app:** Open an issue in this repository
- **Cloud Run:** https://cloud.google.com/support
- **GitHub Actions:** https://support.github.com

---

**Last Updated:** 2025-10-05
**Version:** 1.0.0
