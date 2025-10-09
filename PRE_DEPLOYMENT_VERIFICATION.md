# ✅ Pre-Deployment Verification Checklist

Use this checklist before your first deployment to ensure everything is configured correctly.

## 🎯 Quick Verification

Run these commands to verify your setup:

### 1. Verify GitHub Secrets

Go to: `https://github.com/YOUR_USERNAME/Samaanai_apps/settings/secrets/actions`

Confirm you see these 4 secrets:
- [ ] `GCP_PROJECT_ID_STAGING`
- [ ] `GCP_PROJECT_ID_PROD`
- [ ] `GCP_SA_KEY_STAGING`
- [ ] `GCP_SA_KEY_PROD`

### 2. Verify Staging GCP Setup

```bash
# Switch to staging project
gcloud config set project samaanai-staging

# Verify APIs are enabled
echo "Checking APIs..."
gcloud services list --enabled | grep -E "(run|secretmanager|storage)"

# Expected output should include:
# - run.googleapis.com
# - secretmanager.googleapis.com
# - storage-api.googleapis.com

# Verify secrets exist
echo "Checking secrets..."
gcloud secrets list

# Expected secrets:
# - DATABASE_URL
# - JWT_SECRET
# - JWT_REFRESH_SECRET
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET

# Verify service account
echo "Checking service account..."
gcloud iam service-accounts list | grep github-actions

# Expected output:
# github-actions@samaanai-staging.iam.gserviceaccount.com
```

**Staging Verification Result:** ✅ / ❌

### 3. Verify Production GCP Setup

```bash
# Switch to production project
gcloud config set project samaanai-prod

# Verify APIs are enabled
echo "Checking APIs..."
gcloud services list --enabled | grep -E "(run|secretmanager|storage)"

# Verify secrets exist
echo "Checking secrets..."
gcloud secrets list

# Verify service account
echo "Checking service account..."
gcloud iam service-accounts list | grep github-actions

# Expected output:
# github-actions@samaanai-prod.iam.gserviceaccount.com
```

**Production Verification Result:** ✅ / ❌

### 4. Verify Local Repository

```bash
# Check branches exist
git branch -a

# Expected output should include:
# * main (or current branch)
#   staging
#   remotes/origin/main
#   remotes/origin/staging

# Verify workflow file
cat .github/workflows/backend-deploy.yml | head -20

# Should see: "name: Deploy Backend to Cloud Run"
```

**Repository Verification Result:** ✅ / ❌

### 5. Test GitHub Actions (Dry Run)

Don't push yet! Just verify the workflow file is valid:

```bash
# Check workflow syntax (requires GitHub CLI)
gh workflow list

# Expected output:
# Deploy Backend to Cloud Run  active  ...
```

**Workflow Verification Result:** ✅ / ❌

## 📋 Detailed Checklist

### Part 1: Google Cloud Platform

#### Staging Environment

- [ ] **Project created:** `samaanai-staging`
- [ ] **APIs enabled:**
  - [ ] Cloud Run API (`run.googleapis.com`)
  - [ ] Cloud Build API (`cloudbuild.googleapis.com`)
  - [ ] Secret Manager API (`secretmanager.googleapis.com`)
  - [ ] Container Registry API (`containerregistry.googleapis.com`)
- [ ] **Service account created:** `github-actions@samaanai-staging.iam.gserviceaccount.com`
- [ ] **IAM roles granted:**
  - [ ] `roles/run.admin`
  - [ ] `roles/storage.admin`
  - [ ] `roles/secretmanager.secretAccessor`
  - [ ] `roles/iam.serviceAccountUser`
- [ ] **Service account key downloaded:** `github-actions-staging-key.json`
- [ ] **Secrets created:**
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] `JWT_REFRESH_SECRET`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`

#### Production Environment

- [ ] **Project created:** `samaanai-prod`
- [ ] **APIs enabled:**
  - [ ] Cloud Run API
  - [ ] Cloud Build API
  - [ ] Secret Manager API
  - [ ] Container Registry API
- [ ] **Service account created:** `github-actions@samaanai-prod.iam.gserviceaccount.com`
- [ ] **IAM roles granted:**
  - [ ] `roles/run.admin`
  - [ ] `roles/storage.admin`
  - [ ] `roles/secretmanager.secretAccessor`
  - [ ] `roles/iam.serviceAccountUser`
- [ ] **Service account key downloaded:** `github-actions-prod-key.json`
- [ ] **Secrets created:**
  - [ ] `DATABASE_URL` (different from staging!)
  - [ ] `JWT_SECRET` (different from staging!)
  - [ ] `JWT_REFRESH_SECRET` (different from staging!)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`

### Part 2: GitHub Repository

- [ ] **Repository created** on GitHub
- [ ] **Local repository initialized**
- [ ] **Branches created:**
  - [ ] `main` branch
  - [ ] `staging` branch
- [ ] **Workflow file exists:** `.github/workflows/backend-deploy.yml`
- [ ] **GitHub Secrets configured:**
  - [ ] `GCP_PROJECT_ID_STAGING` = `samaanai-staging`
  - [ ] `GCP_PROJECT_ID_PROD` = `samaanai-prod`
  - [ ] `GCP_SA_KEY_STAGING` = contents of `github-actions-staging-key.json`
  - [ ] `GCP_SA_KEY_PROD` = contents of `github-actions-prod-key.json`
- [ ] **Code committed and pushed**

### Part 3: Database Setup

#### Staging Database

- [ ] **Database exists and is accessible**
- [ ] **Connection string tested**
- [ ] **DATABASE_URL secret is correct**
- [ ] **Prisma schema exists:** `backend-express/prisma/schema.prisma`

#### Production Database

- [ ] **Database exists and is accessible**
- [ ] **Connection string tested**
- [ ] **DATABASE_URL secret is correct** (different from staging!)
- [ ] **Database is separate from staging**

### Part 4: Security

- [ ] **Service account keys NOT committed to git**
- [ ] **`.gitignore` includes `*-key.json`**
- [ ] **Staging and production use different secrets**
- [ ] **Strong passwords generated** (32+ characters)
- [ ] **No secrets in code or config files**

### Part 5: Code & Tests

- [ ] **All tests pass locally:** `npm test`
- [ ] **Health endpoint exists:** `backend-express/src/server.js:53`
- [ ] **Dockerfile exists:** `backend-express/Dockerfile`
- [ ] **Dependencies up to date:** `npm audit`

## 🧪 Test Deployment (Staging First!)

Before deploying to production, test with staging:

### Staging Deployment Test

```bash
# 1. Ensure on staging branch
git checkout staging

# 2. Make a small change (to trigger deployment)
echo "# Test deployment" >> README.md

# 3. Commit and push
git add README.md
git commit -m "test: verify staging deployment"
git push origin staging

# 4. Monitor deployment
# Go to: https://github.com/YOUR_USERNAME/Samaanai_apps/actions

# 5. Wait for completion (3-5 minutes)

# 6. Get service URL from Actions output

# 7. Test health endpoint
SERVICE_URL="https://samaanai-backend-staging-xxxxx.run.app"
curl $SERVICE_URL/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...,"environment":"staging"}
```

**Staging Deployment Test Result:** ✅ / ❌

### If Staging Test Passes

✅ **You're ready for production!**

Follow the same process but merge to `main` branch.

### If Staging Test Fails

❌ **Troubleshoot before production:**

1. Check GitHub Actions logs for errors
2. Verify all secrets are correct
3. Check Cloud Run logs:
   ```bash
   gcloud config set project samaanai-staging
   gcloud run services logs read samaanai-backend-staging --region us-central1
   ```
4. Review error messages
5. Fix issues and retry

## 🔍 Common Issues

### Issue: "Secret not found"

**Check:**
```bash
gcloud config set project samaanai-staging  # or samaanai-prod
gcloud secrets list
```

**Fix:**
```bash
# Create missing secret
echo -n "your-secret-value" | gcloud secrets create SECRET_NAME --data-file=-
```

### Issue: "Permission denied"

**Check:**
```bash
# Verify service account has roles
gcloud projects get-iam-policy PROJECT_ID | grep github-actions
```

**Fix:**
```bash
# Re-grant roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:github-actions@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

### Issue: "Database connection failed"

**Check:**
```bash
# View DATABASE_URL (first 50 chars)
gcloud secrets versions access latest --secret=DATABASE_URL | head -c 50
```

**Fix:**
- Verify database is running
- Check connection string format
- Test connection manually

### Issue: "Workflow not triggering"

**Check:**
- Pushed to correct branch (`staging` or `main`)
- Changes in `backend-express/` directory
- Workflow file syntax is valid

**Fix:**
- Try manual trigger in GitHub Actions UI
- Check GitHub Actions tab for error messages

## ✅ Final Pre-Deployment Checklist

Before first production deployment:

- [ ] ✅ All verification commands passed
- [ ] ✅ Staging deployment successful
- [ ] ✅ Staging thoroughly tested
- [ ] ✅ Health check working in staging
- [ ] ✅ API endpoints working in staging
- [ ] ✅ Database migrations successful in staging
- [ ] ✅ No errors in staging logs
- [ ] ✅ Production secrets configured (different from staging)
- [ ] ✅ Production database set up and tested
- [ ] ✅ Team notified about deployment
- [ ] ✅ Rollback plan understood
- [ ] ✅ Monitoring set up

## 🚀 Ready to Deploy!

If all checks passed:

### Deploy to Production

```bash
# 1. Ensure staging is fully tested
# 2. Create PR: staging → main
git checkout main
git merge staging

# 3. Push to production
git push origin main

# 4. Monitor deployment
# Go to: https://github.com/YOUR_USERNAME/Samaanai_apps/actions

# 5. Verify deployment
SERVICE_URL="https://samaanai-backend-xxxxx.run.app"
curl $SERVICE_URL/health

# 6. Monitor logs
gcloud config set project samaanai-prod
gcloud run services logs tail samaanai-backend --region us-central1
```

## 📊 Verification Summary

| Component | Staging | Production | Notes |
|-----------|---------|------------|-------|
| GCP Project | ☐ | ☐ | |
| APIs Enabled | ☐ | ☐ | |
| Service Account | ☐ | ☐ | |
| IAM Roles | ☐ | ☐ | |
| Secrets Created | ☐ | ☐ | Different values! |
| GitHub Secrets | ☐ | ☐ | 4 total |
| Database Setup | ☐ | ☐ | Separate DBs |
| Test Deployment | ☐ | ☐ | Staging first! |

**Overall Status:** ☐ Ready / ☐ Not Ready

## 📝 Notes

Use this space to track your progress:

```
Date: _____________

Staging Project ID: _____________
Production Project ID: _____________

Staging Service URL: _____________
Production Service URL: _____________

Issues Encountered:




Resolved:




```

---

**Last Updated:** 2025-10-05
**Version:** 2.0.0

Good luck with your deployment! 🚀
