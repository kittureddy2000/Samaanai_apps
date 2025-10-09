# 🎯 Staging & Production Deployment Guide

Complete guide for deploying Samaanai to both **staging** and **production** Google Cloud Run environments.

## Table of Contents

1. [Overview](#overview)
2. [Environment Strategy](#environment-strategy)
3. [Initial Setup](#initial-setup)
4. [Deployment Flow](#deployment-flow)
5. [Configuration](#configuration)
6. [Secrets Management](#secrets-management)
7. [Testing Strategy](#testing-strategy)
8. [Troubleshooting](#troubleshooting)

## Overview

Your CI/CD pipeline now supports **two separate environments**:

### 🧪 Staging Environment
- **Purpose:** Pre-production testing and validation
- **GCP Project:** `samaanai-staging` (or your staging project)
- **Branch:** `staging`
- **Service Name:** `samaanai-backend-staging`
- **Resources:** Lower (512MB RAM, 0 min instances)
- **Cost:** Minimal (free tier eligible)

### 🚀 Production Environment
- **Purpose:** Live application for real users
- **GCP Project:** `samaanai-prod` (or your production project)
- **Branch:** `main`
- **Service Name:** `samaanai-backend`
- **Resources:** Higher (1GB RAM, 1 min instance)
- **Cost:** Optimized for reliability

## Environment Strategy

### Automatic Deployment Triggers

```mermaid
graph LR
    A[Push to 'staging' branch] -->|Auto-deploy| B[Staging Environment]
    C[Push to 'main' branch] -->|Auto-deploy| D[Production Environment]
    E[Manual Trigger] -->|Select env| F{Choose}
    F -->|Staging| B
    F -->|Production| D
```

### Branch Strategy

```
main (production)
  ↑
  | PR & Review
  |
staging (pre-production)
  ↑
  | Feature branches
  |
feature/* (development)
```

### Workflow Logic

| Trigger | Branch | Environment | Service Name |
|---------|--------|-------------|--------------|
| Push | `main` | Production | `samaanai-backend` |
| Push | `staging` | Staging | `samaanai-backend-staging` |
| Manual | User selects | Staging or Production | Based on selection |

## Initial Setup

### Step 1: Create Both GCP Projects

#### Staging Project

```bash
# Create staging project
gcloud projects create samaanai-staging --name="Samaanai Staging"
gcloud config set project samaanai-staging

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions - Staging"

# Grant IAM roles
PROJECT_ID="samaanai-staging"
for role in run.admin storage.admin secretmanager.secretAccessor iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/${role}"
done

# Create service account key
gcloud iam service-accounts keys create github-actions-staging-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

echo "✅ Staging service account key: github-actions-staging-key.json"
```

#### Production Project

```bash
# Create production project
gcloud projects create samaanai-prod --name="Samaanai Production"
gcloud config set project samaanai-prod

# Enable APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions - Production"

# Grant IAM roles
PROJECT_ID="samaanai-prod"
for role in run.admin storage.admin secretmanager.secretAccessor iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/${role}"
done

# Create service account key
gcloud iam service-accounts keys create github-actions-prod-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

echo "✅ Production service account key: github-actions-prod-key.json"
```

### Step 2: Create Secrets in Both Projects

#### Staging Secrets

```bash
# Switch to staging project
gcloud config set project samaanai-staging

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Database URL for staging
# Option A: Staging Cloud SQL
DATABASE_URL="postgresql://staging_user:STAGING_PASSWORD@/samaanai_staging?host=/cloudsql/samaanai-staging:us-central1:samaanai-db"

# Option B: External staging database (e.g., Neon, Supabase)
DATABASE_URL="postgresql://user:pass@staging-host:5432/samaanai_staging?sslmode=require"

# Create secrets
echo -n "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "$JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "$JWT_REFRESH_SECRET" | gcloud secrets create JWT_REFRESH_SECRET --data-file=-

# Google OAuth (use staging credentials)
echo -n "staging-google-client-id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "staging-google-client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-

# Verify
gcloud secrets list
```

#### Production Secrets

```bash
# Switch to production project
gcloud config set project samaanai-prod

# Generate NEW secrets (different from staging!)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Database URL for production
# Option A: Production Cloud SQL
DATABASE_URL="postgresql://prod_user:PROD_PASSWORD@/samaanai?host=/cloudsql/samaanai-prod:us-central1:samaanai-db"

# Option B: External production database
DATABASE_URL="postgresql://user:pass@prod-host:5432/samaanai?sslmode=require"

# Create secrets
echo -n "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "$JWT_SECRET" | gcloud secrets create JWT_SECRET --data-file=-
echo -n "$JWT_REFRESH_SECRET" | gcloud secrets create JWT_REFRESH_SECRET --data-file=-

# Google OAuth (use production credentials)
echo -n "production-google-client-id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "production-google-client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-

# Verify
gcloud secrets list
```

### Step 3: Configure GitHub Secrets

Go to your GitHub repository:
```
Settings → Secrets and variables → Actions → New repository secret
```

Add these **4 secrets**:

#### 1. GCP_PROJECT_ID_STAGING
```
Name: GCP_PROJECT_ID_STAGING
Value: samaanai-staging
```

#### 2. GCP_PROJECT_ID_PROD
```
Name: GCP_PROJECT_ID_PROD
Value: samaanai-prod
```

#### 3. GCP_SA_KEY_STAGING
```
Name: GCP_SA_KEY_STAGING
Value: (paste entire contents of github-actions-staging-key.json)
```

Get the contents:
```bash
cat github-actions-staging-key.json
```

#### 4. GCP_SA_KEY_PROD
```
Name: GCP_SA_KEY_PROD
Value: (paste entire contents of github-actions-prod-key.json)
```

Get the contents:
```bash
cat github-actions-prod-key.json
```

### Step 4: Create Staging Branch

```bash
# Create staging branch from main
git checkout -b staging
git push -u origin staging

# Set up branch protection (optional but recommended)
# Go to: Settings → Branches → Add rule
# Branch name pattern: staging
# Enable: Require pull request reviews before merging
```

### Step 5: Configure GitHub Environments (Optional but Recommended)

This adds manual approval for production deployments.

1. Go to: **Settings → Environments**
2. Create two environments:

**Staging Environment:**
- Name: `staging`
- No protection rules needed

**Production Environment:**
- Name: `production`
- ✅ Required reviewers: Add yourself or team
- ✅ Wait timer: 0 minutes (or add delay)
- ✅ Deployment branches: Only `main` branch

## Deployment Flow

### Development → Staging Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-endpoint

# 2. Make changes
vim backend-express/src/routes/auth.js

# 3. Commit changes
git add .
git commit -m "feat: add new authentication endpoint"

# 4. Push and create PR to staging
git push origin feature/new-endpoint
# Create PR on GitHub: feature/new-endpoint → staging

# 5. Merge PR to staging
# This automatically deploys to STAGING environment

# 6. Test in staging
curl https://samaanai-backend-staging-xxxxx.run.app/health
```

### Staging → Production Workflow

```bash
# 1. Test thoroughly in staging
# Run integration tests
# Perform manual QA
# Check logs and metrics

# 2. Create PR from staging to main
# On GitHub: Create PR: staging → main

# 3. Review and approve
# Code review
# Check staging metrics
# Verify all tests pass

# 4. Merge to main
# This automatically deploys to PRODUCTION environment
```

### Manual Deployment

For emergency deployments or testing:

1. Go to: **Actions** tab in GitHub
2. Select: **Deploy Backend to Cloud Run**
3. Click: **Run workflow**
4. Select:
   - Branch: `main` or `staging`
   - Environment: `staging` or `production`
5. Click: **Run workflow**

## Configuration

### Environment-Specific Settings

The workflow automatically adjusts resources based on environment:

#### Staging Configuration
```yaml
MIN_INSTANCES: 0          # No idle costs
MAX_INSTANCES: 10         # Limited scaling
MEMORY: 512Mi             # Lower memory
CPU: 1                    # 1 vCPU
```

#### Production Configuration
```yaml
MIN_INSTANCES: 1          # Always 1 instance (no cold starts)
MAX_INSTANCES: 100        # Higher scaling
MEMORY: 1Gi               # More memory
CPU: 1                    # 1 vCPU
```

### Service Names

- **Staging:** `samaanai-backend-staging`
- **Production:** `samaanai-backend`

### Docker Image Tags

Each build creates 3 tags:

```bash
# Staging
gcr.io/samaanai-staging/samaanai-backend-staging:abc1234  # Commit SHA
gcr.io/samaanai-staging/samaanai-backend-staging:latest   # Latest
gcr.io/samaanai-staging/samaanai-backend-staging:staging  # Environment

# Production
gcr.io/samaanai-prod/samaanai-backend:abc1234             # Commit SHA
gcr.io/samaanai-prod/samaanai-backend:latest              # Latest
gcr.io/samaanai-prod/samaanai-backend:production          # Environment
```

## Secrets Management

### Best Practices

✅ **DO:**
- Use **different** secrets for staging and production
- Rotate secrets every 90 days
- Use strong, random secrets (32+ characters)
- Store secrets in Google Secret Manager only
- Audit secret access regularly

❌ **DON'T:**
- Reuse production secrets in staging
- Share secrets between environments
- Store secrets in code or config files
- Commit service account keys to git

### Secret Rotation

#### Rotate Staging Secrets

```bash
gcloud config set project samaanai-staging

# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Add new version
echo -n "$NEW_SECRET" | gcloud secrets versions add JWT_SECRET --data-file=-

# Deploy to pick up new secret
# (No code changes needed - Cloud Run will use latest version)
```

#### Rotate Production Secrets

```bash
gcloud config set project samaanai-prod

# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Add new version
echo -n "$NEW_SECRET" | gcloud secrets versions add JWT_SECRET --data-file=-

# Deploy to production
git push origin main
```

## Testing Strategy

### Staging Testing Checklist

Before promoting to production:

- [ ] All automated tests pass
- [ ] Manual QA completed
- [ ] API endpoints respond correctly
- [ ] Authentication works
- [ ] Database migrations successful
- [ ] No errors in Cloud Run logs
- [ ] Performance acceptable
- [ ] Health check passing

### Staging Test Commands

```bash
# Set staging URL
STAGING_URL="https://samaanai-backend-staging-xxxxx.run.app"

# Health check
curl $STAGING_URL/health

# Test authentication
curl -X POST $STAGING_URL/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'

# Check logs
gcloud config set project samaanai-staging
gcloud run services logs read samaanai-backend-staging --region us-central1
```

### Production Verification

After production deployment:

```bash
# Set production URL
PROD_URL="https://samaanai-backend-xxxxx.run.app"

# Health check
curl $PROD_URL/health

# Monitor logs
gcloud config set project samaanai-prod
gcloud run services logs tail samaanai-backend --region us-central1

# Check metrics in Cloud Console
# https://console.cloud.google.com/run/detail/us-central1/samaanai-backend/metrics
```

## Monitoring

### Staging Monitoring

```bash
# Switch to staging
gcloud config set project samaanai-staging

# View logs
gcloud run services logs read samaanai-backend-staging --region us-central1 --limit 50

# Describe service
gcloud run services describe samaanai-backend-staging --region us-central1
```

### Production Monitoring

```bash
# Switch to production
gcloud config set project samaanai-prod

# Tail logs in real-time
gcloud run services logs tail samaanai-backend --region us-central1

# View recent errors only
gcloud run services logs read samaanai-backend --region us-central1 | grep ERROR
```

### Set Up Alerts

#### Staging Alerts (Optional)

Basic error monitoring.

#### Production Alerts (Recommended)

```bash
gcloud config set project samaanai-prod

# Create notification channel (email)
gcloud alpha monitoring channels create \
  --display-name="Production Alerts" \
  --type=email \
  --channel-labels=email_address=your-email@example.com

# Get channel ID
CHANNEL_ID=$(gcloud alpha monitoring channels list --format="value(name)")

# Create alert for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="High Error Rate - Production" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

## Troubleshooting

### Deployment to Wrong Environment

**Problem:** Pushed to wrong branch, deployed to wrong environment

**Solution:**
```bash
# Rollback in affected environment
gcloud run revisions list --service SERVICE_NAME --region us-central1

# Route traffic to previous revision
gcloud run services update-traffic SERVICE_NAME \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

### Secrets Not Found

**Problem:** Deployment fails with "Secret not found"

**Solution:**
```bash
# Check you're in the right project
gcloud config get-value project

# List secrets
gcloud secrets list

# Create missing secret
echo -n "secret-value" | gcloud secrets create SECRET_NAME --data-file=-
```

### GitHub Secrets Wrong

**Problem:** Authentication fails, wrong project deployed

**Solution:**
1. Verify GitHub secrets match:
   - `GCP_PROJECT_ID_STAGING` = staging project ID
   - `GCP_PROJECT_ID_PROD` = production project ID
2. Verify service account keys are correct
3. Re-download keys if needed

### Database Connection Issues

**Problem:** Staging/production can't connect to database

**Solution:**
```bash
# Check DATABASE_URL secret
gcloud secrets versions access latest --secret=DATABASE_URL

# Verify database is accessible
# For Cloud SQL:
gcloud sql instances describe INSTANCE_NAME

# Test connection
gcloud sql connect INSTANCE_NAME --user=postgres
```

## Cost Management

### Staging Costs

With the configuration (0 min instances, 512MB):
- **Expected:** $0-5/month (mostly free tier)
- **Traffic:** Minimal (internal testing only)

### Production Costs

With the configuration (1 min instance, 1GB):
- **Expected:** $10-30/month for small apps
- **Traffic:** Varies based on users
- **Optimization:** Monitor and adjust min-instances if needed

### Cost Monitoring

```bash
# View estimated costs
# https://console.cloud.google.com/billing

# Set budget alerts
# https://console.cloud.google.com/billing/budgets

# Recommended: Set budget alerts for both projects
# Staging: $10/month alert
# Production: $50/month alert
```

## Quick Reference

### Deployment Commands

```bash
# Deploy to staging
git checkout staging
git merge feature/branch-name
git push origin staging

# Deploy to production
git checkout main
git merge staging
git push origin main
```

### Service URLs

After deployment, find URLs in:
- GitHub Actions output
- Or run:

```bash
# Staging
gcloud config set project samaanai-staging
gcloud run services describe samaanai-backend-staging --region us-central1 --format='value(status.url)'

# Production
gcloud config set project samaanai-prod
gcloud run services describe samaanai-backend --region us-central1 --format='value(status.url)'
```

### Required GitHub Secrets

✅ `GCP_PROJECT_ID_STAGING` - Staging project ID
✅ `GCP_PROJECT_ID_PROD` - Production project ID
✅ `GCP_SA_KEY_STAGING` - Staging service account key (JSON)
✅ `GCP_SA_KEY_PROD` - Production service account key (JSON)

### Environment Variables Set by Workflow

Both environments receive:
- `NODE_ENV` = environment name (staging/production)
- `PORT` = 8080
- `ENVIRONMENT` = environment name
- All secrets from Secret Manager

## Summary

### Staging Environment
- **Purpose:** Testing before production
- **Branch:** `staging`
- **Project:** `samaanai-staging`
- **Resources:** Minimal (cost-effective)
- **Deployment:** Automatic on push to `staging`

### Production Environment
- **Purpose:** Live application
- **Branch:** `main`
- **Project:** `samaanai-prod`
- **Resources:** Optimized (reliable)
- **Deployment:** Automatic on push to `main`

### Workflow
1. Develop → Feature branch
2. Test → Merge to `staging` → Auto-deploy to staging
3. Validate → Merge to `main` → Auto-deploy to production
4. Monitor → Both environments

---

**Last Updated:** 2025-10-05
**Version:** 2.0.0
