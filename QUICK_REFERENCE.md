# 🚀 Quick Reference Guide - Samaanai Deployment

One-page reference for common deployment tasks.

## 📋 GitHub Secrets Required

Add these in: **Settings → Secrets and variables → Actions**

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `GCP_PROJECT_ID_STAGING` | Staging project ID | `samaanai-staging` |
| `GCP_PROJECT_ID_PROD` | Production project ID | `samaanai-prod` |
| `GCP_SA_KEY_STAGING` | Staging service account key | `{...json...}` |
| `GCP_SA_KEY_PROD` | Production service account key | `{...json...}` |

## 🎯 Deployment Triggers

| Action | Environment | Automatic? |
|--------|-------------|------------|
| Push to `staging` branch | Staging | ✅ Yes |
| Push to `main` branch | Production | ✅ Yes |
| Manual workflow trigger | User selects | ⚙️ Manual |

## 🔄 Development Workflow

### Deploy to Staging

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... edit files ...

# 3. Commit
git add .
git commit -m "feat: add new feature"

# 4. Push to staging
git checkout staging
git merge feature/new-feature
git push origin staging
# ✅ Auto-deploys to staging

# 5. Test staging
curl https://samaanai-backend-staging-xxxxx.run.app/health
```

### Deploy to Production

```bash
# 1. Test thoroughly in staging
# ... run tests, QA, etc ...

# 2. Merge to main
git checkout main
git merge staging
git push origin main
# ✅ Auto-deploys to production

# 3. Verify production
curl https://samaanai-backend-xxxxx.run.app/health
```

## 🔑 Secret Management

### Create Secrets (Staging)

```bash
gcloud config set project samaanai-staging

# Database
echo -n "postgresql://..." | gcloud secrets create DATABASE_URL --data-file=-

# JWT Secrets
openssl rand -base64 32 | gcloud secrets create JWT_SECRET --data-file=-
openssl rand -base64 32 | gcloud secrets create JWT_REFRESH_SECRET --data-file=-

# Google OAuth
echo -n "client-id" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "client-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
```

### Create Secrets (Production)

```bash
gcloud config set project samaanai-prod

# Same commands as staging, but with DIFFERENT values!
# ⚠️ Never reuse staging secrets in production
```

## 📊 Monitoring

### View Logs

```bash
# Staging
gcloud config set project samaanai-staging
gcloud run services logs read samaanai-backend-staging --region us-central1 --limit 50

# Production
gcloud config set project samaanai-prod
gcloud run services logs tail samaanai-backend --region us-central1
```

### Get Service URLs

```bash
# Staging
gcloud config set project samaanai-staging
gcloud run services describe samaanai-backend-staging --region us-central1 --format='value(status.url)'

# Production
gcloud config set project samaanai-prod
gcloud run services describe samaanai-backend --region us-central1 --format='value(status.url)'
```

## 🔧 Common Operations

### Manual Deployment

1. Go to: **Actions** tab in GitHub
2. Click: **Deploy Backend to Cloud Run**
3. Click: **Run workflow**
4. Select environment: `staging` or `production`
5. Click: **Run workflow**

### Rollback

```bash
# List revisions
gcloud run revisions list --service SERVICE_NAME --region us-central1

# Rollback to previous
gcloud run services update-traffic SERVICE_NAME \
  --region us-central1 \
  --to-revisions REVISION_NAME=100
```

### Update Secret

```bash
# Generate new value
NEW_VALUE=$(openssl rand -base64 32)

# Add new version
echo -n "$NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-

# Redeploy to pick up new secret
git push origin staging  # or main
```

## 🏗️ Environment Differences

| Feature | Staging | Production |
|---------|---------|------------|
| **Branch** | `staging` | `main` |
| **Project** | `samaanai-staging` | `samaanai-prod` |
| **Service Name** | `samaanai-backend-staging` | `samaanai-backend` |
| **Min Instances** | 0 (no idle cost) | 1 (no cold starts) |
| **Max Instances** | 10 | 100 |
| **Memory** | 512Mi | 1Gi |
| **CPU** | 1 vCPU | 1 vCPU |
| **Cost** | ~$0-5/mo | ~$10-30/mo |

## 🧪 Testing

### Health Check

```bash
# Staging
curl https://samaanai-backend-staging-xxxxx.run.app/health

# Production
curl https://samaanai-backend-xxxxx.run.app/health
```

### API Test

```bash
# Test auth endpoint
curl -X POST https://YOUR-SERVICE-URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🚨 Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify all 4 GitHub secrets exist
3. Ensure GCP APIs are enabled
4. Check service account has required permissions

### Secret Not Found

```bash
# Verify secret exists
gcloud secrets list

# Check project
gcloud config get-value project

# View secret (first 10 chars)
gcloud secrets versions access latest --secret=SECRET_NAME | head -c 10
```

### Database Connection Error

```bash
# Check DATABASE_URL
gcloud secrets versions access latest --secret=DATABASE_URL

# Test database connection
gcloud sql connect INSTANCE_NAME --user=postgres
```

## 📚 Documentation Index

- **Initial Setup:** [`GITHUB_SETUP.md`](./GITHUB_SETUP.md)
- **Staging & Production:** [`STAGING_PRODUCTION_SETUP.md`](./STAGING_PRODUCTION_SETUP.md)
- **Deployment Checklist:** [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md)
- **Environment Guide:** [`DEPLOYMENT.md`](./DEPLOYMENT.md)
- **Setup Summary:** [`SETUP_SUMMARY.md`](./SETUP_SUMMARY.md)
- **Google OAuth:** [`GOOGLE_OAUTH_SETUP.md`](./GOOGLE_OAUTH_SETUP.md)
- **Testing:** [`TESTING.md`](./TESTING.md)

## 🔗 Useful Links

- [Cloud Run Console](https://console.cloud.google.com/run)
- [Secret Manager](https://console.cloud.google.com/security/secret-manager)
- [Cloud Build](https://console.cloud.google.com/cloud-build)
- [GitHub Actions](https://github.com/YOUR-USERNAME/Samaanai_apps/actions)

---

**Version:** 2.0.0 (Staging + Production)
