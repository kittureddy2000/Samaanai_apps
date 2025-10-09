# 🚀 Deployment Checklist - Samaanai

Quick reference checklist for deploying Samaanai to Google Cloud Run via GitHub Actions.

## Pre-Deployment Setup (One-Time)

### ☑️ Google Cloud Platform Setup

- [ ] Create GCP project (e.g., `samaanai-prod`)
- [ ] Enable required APIs:
  - [ ] Cloud Run API
  - [ ] Cloud Build API
  - [ ] Secret Manager API
  - [ ] Container Registry API
  - [ ] Cloud SQL API (if using Cloud SQL)
- [ ] Create service account for GitHub Actions
- [ ] Grant IAM roles to service account:
  - [ ] `roles/run.admin`
  - [ ] `roles/storage.admin`
  - [ ] `roles/secretmanager.secretAccessor`
  - [ ] `roles/iam.serviceAccountUser`
- [ ] Download service account key (JSON file)

### ☑️ Secret Manager Setup

Create these secrets in Google Secret Manager:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - JWT signing secret (32+ chars)
- [ ] `JWT_REFRESH_SECRET` - Refresh token secret (32+ chars)
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID (if using)
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth secret (if using)

**Quick Commands:**

```bash
# Generate strong secrets
openssl rand -base64 32

# Create secrets
echo -n "your-secret" | gcloud secrets create SECRET_NAME --data-file=-

# Verify
gcloud secrets list
```

### ☑️ Database Setup

**Option A: Cloud SQL (Recommended for Production)**

- [ ] Create Cloud SQL PostgreSQL instance
- [ ] Create database (`samaanai`)
- [ ] Create database user
- [ ] Update `DATABASE_URL` secret with connection string

**Option B: External Database (Neon, Supabase, etc.)**

- [ ] Create database on external provider
- [ ] Get connection string
- [ ] Update `DATABASE_URL` secret

### ☑️ GitHub Repository Setup

- [ ] Create GitHub repository
- [ ] Push code to repository
- [ ] Add GitHub Secrets:
  - [ ] `GCP_PROJECT_ID` - Your GCP project ID
  - [ ] `GCP_SA_KEY` - Contents of service account JSON key

**Where to add secrets:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

## First Deployment

### ☑️ Pre-Flight Checks

- [ ] All tests passing locally: `npm test`
- [ ] Code committed and pushed to GitHub
- [ ] GitHub secrets configured
- [ ] GCP secrets created
- [ ] Database accessible

### ☑️ Trigger Deployment

**Method 1: Push to Main**
```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

**Method 2: Manual Workflow Trigger**
1. Go to GitHub repository
2. Click **Actions** tab
3. Select **Deploy Backend to Cloud Run**
4. Click **Run workflow**

### ☑️ Monitor Deployment

- [ ] Go to **Actions** tab in GitHub
- [ ] Click on running workflow
- [ ] Monitor these steps:
  - [ ] ✅ Run Tests
  - [ ] ✅ Checkout code
  - [ ] ✅ Authenticate to Google Cloud
  - [ ] ✅ Build Docker Image
  - [ ] ✅ Push Docker Image
  - [ ] ✅ Deploy to Cloud Run
  - [ ] ✅ Run Database Migrations
  - [ ] ✅ Get Service URL
  - [ ] ✅ Health Check

### ☑️ Post-Deployment Verification

- [ ] Note the Service URL from deployment logs
- [ ] Test health endpoint:
  ```bash
  curl https://samaanai-backend-xxxxx.run.app/health
  ```
- [ ] Test API endpoint:
  ```bash
  curl https://samaanai-backend-xxxxx.run.app/api/v1/auth/login
  ```
- [ ] Check Cloud Run logs:
  ```bash
  gcloud run services logs read samaanai-backend --region us-central1 --limit 50
  ```
- [ ] Verify database migrations ran successfully
- [ ] Test authentication flow
- [ ] Test key API endpoints

## Subsequent Deployments

### ☑️ Development Workflow

1. **Make Changes**
   ```bash
   # Edit code
   vim backend-express/src/controllers/authController.js
   ```

2. **Test Locally**
   ```bash
   npm test
   docker-compose up  # Test in development
   docker-compose -f docker-compose.prod.yml up  # Test production build
   ```

3. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```

4. **Monitor Deployment**
   - Check GitHub Actions
   - Verify deployment succeeded
   - Test deployed service

## Rollback Procedure

If deployment fails or introduces bugs:

### ☑️ Quick Rollback

```bash
# List revisions
gcloud run revisions list --service samaanai-backend --region us-central1

# Identify last working revision
# Rollback to specific revision
gcloud run services update-traffic samaanai-backend \
  --region us-central1 \
  --to-revisions REVISION_NAME=100

# Verify
curl https://samaanai-backend-xxxxx.run.app/health
```

### ☑️ Fix and Redeploy

1. Identify the issue
2. Fix in code
3. Test locally
4. Commit and push
5. Monitor new deployment

## Troubleshooting Common Issues

### ❌ Tests Failing in CI

**Check:**
- [ ] Tests pass locally: `npm test`
- [ ] Dependencies installed: `npm ci`
- [ ] Prisma client generated: `npx prisma generate`

**Fix:**
```bash
# Update tests to work without real database
# Or mock database connections
```

### ❌ Docker Build Fails

**Check:**
- [ ] Dockerfile syntax correct
- [ ] All dependencies in package.json
- [ ] Build works locally: `docker build -t test .`

**Fix:**
```bash
# Test build locally
cd backend-express
docker build -t samaanai-test .
```

### ❌ Deployment Fails: "Permission Denied"

**Check:**
- [ ] Service account has required IAM roles
- [ ] `GCP_SA_KEY` secret is correct JSON

**Fix:**
```bash
# Re-grant permissions
PROJECT_ID=$(gcloud config get-value project)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

### ❌ Secret Not Found

**Check:**
- [ ] Secret exists: `gcloud secrets list`
- [ ] Secret has value: `gcloud secrets versions list SECRET_NAME`

**Fix:**
```bash
# Create missing secret
echo -n "your-secret-value" | gcloud secrets create SECRET_NAME --data-file=-
```

### ❌ Database Connection Fails

**Check:**
- [ ] `DATABASE_URL` secret is correct
- [ ] Database is accessible
- [ ] Cloud SQL instance running (if using)

**Fix:**
```bash
# Test database connection
gcloud sql connect samaanai-db --user=postgres

# Verify DATABASE_URL format
# For Cloud SQL: postgresql://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE
# For external: postgresql://user:pass@host:5432/dbname?sslmode=require
```

### ❌ Health Check Fails

**Check:**
- [ ] Service is running: `gcloud run services describe samaanai-backend --region us-central1`
- [ ] Health endpoint exists in code (line 53 in server.js)
- [ ] Port 8080 is exposed

**Fix:**
```bash
# Check service logs
gcloud run services logs read samaanai-backend --region us-central1

# Test health endpoint manually
curl https://samaanai-backend-xxxxx.run.app/health
```

## Monitoring & Maintenance

### ☑️ Regular Checks

**Daily:**
- [ ] Check error rates in Cloud Console
- [ ] Monitor response times
- [ ] Review logs for issues

**Weekly:**
- [ ] Review cost & usage
- [ ] Check for security updates
- [ ] Review deployment metrics

**Monthly:**
- [ ] Rotate secrets (if policy requires)
- [ ] Review IAM permissions
- [ ] Update dependencies

### ☑️ Monitoring Commands

```bash
# View recent logs
gcloud run services logs read samaanai-backend --region us-central1 --limit 100

# Tail logs in real-time
gcloud run services logs tail samaanai-backend --region us-central1

# Check service status
gcloud run services describe samaanai-backend --region us-central1

# List all revisions
gcloud run revisions list --service samaanai-backend --region us-central1

# View metrics (in Cloud Console)
# https://console.cloud.google.com/run/detail/us-central1/samaanai-backend/metrics
```

## Security Checklist

### ☑️ Security Best Practices

- [ ] Service account key is NOT in git
- [ ] `.gitignore` includes `*-key.json`
- [ ] All secrets in Secret Manager (not environment variables)
- [ ] Secrets rotated regularly (every 90 days)
- [ ] Database uses SSL/TLS
- [ ] API uses HTTPS only
- [ ] Rate limiting enabled
- [ ] Helmet.js configured
- [ ] CORS properly configured
- [ ] Authentication required for sensitive endpoints

## Cost Optimization

### ☑️ Cost Controls

- [ ] Min instances set to 0 (no idle costs)
- [ ] Appropriate memory allocation (512Mi-1Gi)
- [ ] Request timeout configured (300s)
- [ ] Concurrency optimized (80)
- [ ] Max instances limited (10-100)
- [ ] Cloud SQL instance right-sized

**Monitor Costs:**
```bash
# View estimated costs
# https://console.cloud.google.com/billing

# Set budget alerts
# https://console.cloud.google.com/billing/budgets
```

## Quick Reference

### Service URLs

- **Production Backend:** `https://samaanai-backend-xxxxx.run.app`
- **Health Check:** `https://samaanai-backend-xxxxx.run.app/health`
- **API Base:** `https://samaanai-backend-xxxxx.run.app/api/v1`

### Important Files

- **Workflow:** `.github/workflows/backend-deploy.yml`
- **Dockerfile:** `backend-express/Dockerfile`
- **Server:** `backend-express/src/server.js`
- **Environment:** `.env.development` (local), Secret Manager (production)

### Useful Commands

```bash
# Deploy manually
git push origin main

# View deployment status
gh run list  # (requires GitHub CLI)

# Check service
gcloud run services describe samaanai-backend --region us-central1

# View logs
gcloud run services logs read samaanai-backend --region us-central1

# Rollback
gcloud run services update-traffic samaanai-backend --to-revisions REVISION=100

# Update secret
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-
```

## Support Resources

- **Documentation:** See `GITHUB_SETUP.md` for detailed setup
- **Deployment Guide:** See `DEPLOYMENT.md` for environment info
- **Cloud Run Docs:** https://cloud.google.com/run/docs
- **GitHub Actions:** https://docs.github.com/actions

---

**Last Updated:** 2025-10-05
**Version:** 1.0.0
