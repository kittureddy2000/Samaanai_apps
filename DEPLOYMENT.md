# Deployment Guide - Samaanai

Complete guide for understanding development vs production environments and deploying your application.

## Table of Contents

1. [Environment Overview](#environment-overview)
2. [Development Environment](#development-environment)
3. [Production Testing](#production-testing)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Security Best Practices](#security-best-practices)

## Environment Overview

Samaanai has **three distinct environments**:

```
1. Development (Local)         ← Daily coding work
2. Production Testing (Local)  ← Test before deploying
3. Production (Cloud)          ← Real users
```

### Environment Comparison

| Aspect | Development | Production Testing | Production |
|--------|-------------|-------------------|------------|
| **Where** | Your computer | Your computer | Google Cloud |
| **Command** | `docker-compose up` | `docker-compose -f docker-compose.prod.yml up` | `gcloud builds submit` |
| **Config File** | `.env.development` | `.env.production` | Secret Manager |
| **In Git** | ✅ Yes | ❌ No | ❌ No |
| **Hot Reload** | ✅ Yes | ❌ No | ❌ No |
| **Secrets** | Weak (dev) | Strong (test) | Strong (GCP) |
| **Database** | Docker container | Docker container | Cloud SQL |
| **Frontend** | Expo (19006) | Nginx (80) | Nginx (8080/443) |
| **Backend** | nodemon | node | node |
| **Purpose** | Daily development | Pre-deploy testing | Real users |

## Development Environment

### What It Is

Your **daily development environment** for writing code and testing features.

### Quick Start

```bash
# Start development
docker-compose up -d --build

# Access
# Web: http://localhost:19006
# API: http://localhost:8080
```

### Characteristics

✅ **Hot reload** - Changes appear instantly
✅ **Verbose logging** - Debug info everywhere
✅ **Weak secrets** - devpassword123 (acceptable for local)
✅ **Source code mounted** - Edit files, see changes immediately
✅ **Fast iteration** - No rebuild needed

### Configuration

**File:** `docker-compose.yml`

**Environment:** `.env.development` (committed to git)

**Services:**
- PostgreSQL: `samaanai-postgres-dev` (port 5432)
- Backend: `samaanai-backend-dev` (port 8080, nodemon)
- Frontend: `samaanai-frontend-dev` (port 19006, Expo)

### Common Commands

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# Stop
docker-compose down

# Full reset (removes data)
docker-compose down -v

# Rebuild (rarely needed)
docker-compose up -d --build
```

### When to Use

- Writing code
- Testing features
- Debugging issues
- Experimenting
- **99% of your time**

## Production Testing

### What It Is

A **local simulation of production** that lets you test the exact same build that will run in production, but on your machine.

### Setup (One-Time)

```bash
# 1. Create production config
cp .env.production.example .env.production

# 2. Generate strong secrets
openssl rand -base64 32  # JWT_SECRET
openssl rand -base64 32  # JWT_REFRESH_SECRET
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32  # POSTGRES_PASSWORD

# 3. Edit .env.production with generated secrets
nano .env.production
```

### Start Production Testing

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d --build

# Seed data
docker-compose -f docker-compose.prod.yml exec backend node prisma/seed.js

# Access
# Web: http://localhost (port 80)
# API: http://localhost:8080
```

### Characteristics

❌ **NO hot reload** - Must rebuild to see changes
❌ **Minimal logging** - Production level
✅ **Strong secrets** - Real-like passwords
✅ **Code baked into image** - Not mounted
✅ **Same build as production** - Identical Docker images
✅ **Optimized** - Multi-stage builds

### Configuration

**File:** `docker-compose.prod.yml`

**Environment:** `.env.production` (NOT in git, you create it)

**Services:**
- PostgreSQL: `samaanai-postgres-prod` (port 5432)
- Backend: `samaanai-backend-prod` (port 8080, node)
- Frontend: `samaanai-frontend-prod` (port 80, Nginx)

### Common Commands

```bash
# Start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart
docker-compose -f docker-compose.prod.yml restart backend

# Stop
docker-compose -f docker-compose.prod.yml down

# Rebuild (required after code changes)
docker-compose -f docker-compose.prod.yml up -d --build
```

### When to Use

- ✅ Before deploying to real production
- ✅ Testing production build locally
- ✅ Verifying optimizations work
- ✅ Performance testing
- ✅ Catching production-specific bugs

### Why This Is Important

Production Testing catches issues like:
- "Works in dev but breaks in production"
- Build optimization bugs
- Missing dependencies
- Environment variable issues
- Performance problems

## Production Deployment

### Backend (Google Cloud Run)

#### Prerequisites

1. Google Cloud Project created
2. Cloud Run API enabled
3. Cloud Build API enabled
4. Secret Manager API enabled
5. gcloud CLI installed and configured

#### Setup Secrets (One-Time)

```bash
# Navigate to backend
cd backend-express

# Create secrets in Secret Manager
echo -n "your-production-jwt-secret" | gcloud secrets create jwt-secret --data-file=-
echo -n "your-production-refresh-secret" | gcloud secrets create jwt-refresh-secret --data-file=-
echo -n "your-production-database-url" | gcloud secrets create database-url --data-file=-
echo -n "your-plaid-client-id" | gcloud secrets create plaid-client-id --data-file=-
echo -n "your-plaid-secret" | gcloud secrets create plaid-secret --data-file=-
```

#### Deploy Backend

```bash
# Deploy to Cloud Run
gcloud builds submit --config=cloudbuild.yaml

# The cloudbuild.yaml will:
# 1. Build Docker image
# 2. Push to Artifact Registry
# 3. Deploy to Cloud Run
# 4. Inject secrets from Secret Manager
```

#### Verify Deployment

```bash
# Get Cloud Run URL
gcloud run services describe samaanai-api --region=us-central1

# Test health endpoint
curl https://samaanai-api-xxxxx.run.app/health
```

### Mobile Apps (iOS & Android)

#### Prerequisites

1. Expo account created
2. EAS CLI installed: `npm install -g eas-cli`
3. Apple Developer account ($99/year) for iOS
4. Google Play Console account ($25 one-time) for Android

#### Setup (One-Time)

```bash
# Navigate to mobile app
cd samaanai-mobile

# Login to Expo
eas login

# Configure EAS
eas build:configure
```

#### Build for iOS

```bash
# Build production iOS app
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

#### Build for Android

```bash
# Build production Android app
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

### Web App Deployment

#### Option 1: Netlify (Recommended)

```bash
cd samaanai-mobile

# Build web app
npm run web:build

# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd dist
netlify deploy --prod
```

#### Option 2: Vercel

```bash
cd samaanai-mobile

# Install Vercel CLI
npm install -g vercel

# Build and deploy
vercel --prod
```

#### Option 3: Firebase Hosting

```bash
cd samaanai-mobile

# Build
npm run web:build

# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Deploy
firebase deploy
```

## Environment Variables

### Development Environment

**File:** `.env.development` (committed to git)

```bash
# Database
POSTGRES_DB=samaanai_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=devpassword123

# JWT (weak - for dev only)
JWT_SECRET=dev-jwt-secret-not-for-production-12345
JWT_REFRESH_SECRET=dev-refresh-secret-not-for-production-67890

# Plaid
PLAID_ENV=sandbox

# API
API_BASE_URL=http://localhost:8080

# CORS
ALLOWED_ORIGINS=http://localhost:19006,http://localhost:3000

# Logging
LOG_LEVEL=debug
```

### Production Environment (Local Testing)

**File:** `.env.production` (NOT committed, you create it)

```bash
# Database
POSTGRES_DB=samaanai_prod
POSTGRES_USER=samaanai_prod_user
POSTGRES_PASSWORD=aB3$xY9!mK2#vL5@wN8^pQ1&rT4*sU7

# JWT (strong secrets)
JWT_SECRET=4f8a2c9e1b7d6f3a5e8c2b9d1f6a3e7c2b9d1f6a3e7c
JWT_REFRESH_SECRET=9d1f6a3e7c2b9d1f6a3e7c2b9d1f6a3e7c2b9d1f6a3e

# Plaid
PLAID_ENV=production
PLAID_CLIENT_ID=your_real_client_id
PLAID_SECRET=your_real_secret

# API
API_BASE_URL=https://api.yourdomain.com

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Logging
LOG_LEVEL=info
```

### Production (Cloud Run)

**Uses Google Secret Manager** - No .env files!

Secrets are injected at runtime via cloudbuild.yaml:

```yaml
- '--set-secrets=JWT_SECRET=jwt-secret:latest'
- '--set-secrets=JWT_REFRESH_SECRET=jwt-refresh-secret:latest'
- '--set-secrets=DATABASE_URL=database-url:latest'
```

## Security Best Practices

### ✅ DO

1. **Use different secrets per environment**
   - Development: Weak/simple (convenience)
   - Production: Strong/complex (security)

2. **Never commit production secrets**
   ```bash
   # .gitignore already includes:
   .env.production
   .env.local
   .env*.local
   ```

3. **Use Secret Manager in production**
   - Google Cloud → Secret Manager
   - AWS → AWS Secrets Manager
   - Azure → Azure Key Vault

4. **Generate strong secrets**
   ```bash
   openssl rand -base64 32
   ```

5. **Rotate secrets regularly**
   - JWT secrets: Every 90 days
   - Database passwords: Every 6 months
   - API keys: As recommended by provider

6. **Limit CORS origins**
   - Dev: `http://localhost:*`
   - Prod: `https://yourdomain.com` only

7. **Use environment-specific databases**
   - Dev: `samaanai_dev`
   - Staging: `samaanai_staging`
   - Prod: `samaanai_prod`

### ❌ DON'T

1. **Never hardcode secrets**
   ```javascript
   // ❌ BAD
   const secret = "my-secret-key";

   // ✅ GOOD
   const secret = process.env.JWT_SECRET;
   ```

2. **Never commit .env.production**
   ```bash
   # This file should NEVER exist in git
   .env.production
   ```

3. **Never reuse secrets across environments**

4. **Never expose secrets in logs**
   ```javascript
   // ❌ BAD
   console.log('DATABASE_URL:', process.env.DATABASE_URL);

   // ✅ GOOD
   console.log('Database connected');
   ```

5. **Never use weak secrets in production**
   - ❌ `password123`
   - ❌ `secret`
   - ✅ `4f8a2c9e1b7d6f3a5e8c2b9d1f6a3e7c`

## Typical Workflow

### Scenario: Building a New Feature

```bash
# Day 1: Development
docker-compose up -d
# Code for hours, changes appear instantly

# Day 2: Test in production mode
docker-compose down
docker-compose -f docker-compose.prod.yml up -d --build
# Test thoroughly at http://localhost

# Day 2: Deploy to production
docker-compose -f docker-compose.prod.yml down
cd backend-express
gcloud builds submit --config=cloudbuild.yaml

# Live to users!
```

### Scenario: Bug Fix

```bash
# 1. Develop fix
docker-compose up -d
# Fix bug, test fix

# 2. Quick production test
docker-compose down
docker-compose -f docker-compose.prod.yml up -d --build
# Verify fix works

# 3. Deploy
gcloud builds submit
```

## Quick Decision Tree

```
Are you writing/testing code?
├─ YES → Development (docker-compose up)
└─ NO → About to deploy?
    ├─ YES → Production Testing (docker-compose -f docker-compose.prod.yml up)
    │        └─ Tests passed?
    │            ├─ YES → Production (gcloud builds submit)
    │            └─ NO → Back to Development
    └─ NO → Already deployed? → Production
```

## Troubleshooting

### "Cannot find .env.production"

**Solution:** Create it manually
```bash
cp .env.production.example .env.production
nano .env.production
```

### "Port already in use"

**Solution:** Stop other environment
```bash
docker-compose down
# OR
docker-compose -f docker-compose.prod.yml down
```

### "Changes not reflecting in production"

**Solution:** Rebuild required (no hot reload)
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### "Weak credentials warning"

**Solution:** Generate strong secrets
```bash
openssl rand -base64 32
```

## Monitoring Production

### Cloud Run Logs

```bash
# View recent logs
gcloud run services logs read samaanai-api --region=us-central1

# Tail logs
gcloud run services logs tail samaanai-api --region=us-central1
```

### Cloud SQL

```bash
# Connect to production database
gcloud sql connect samaanai-db --user=postgres
```

### Metrics

- View metrics in Cloud Console
- Set up alerting for errors
- Monitor response times
- Track user traffic

## Summary

### Development (docker-compose up)
- **Purpose:** Daily coding
- **Hot reload:** Yes
- **Secrets:** Weak (acceptable)
- **When:** Every day

### Production Testing (docker-compose -f docker-compose.prod.yml up)
- **Purpose:** Pre-deploy testing
- **Hot reload:** No (rebuild required)
- **Secrets:** Strong (real-like)
- **When:** Before each deployment

### Production (gcloud builds submit)
- **Purpose:** Real users
- **Hosting:** Google Cloud
- **Secrets:** Secret Manager
- **When:** After testing passes

## Additional Resources

- **Docker Compose:** https://docs.docker.com/compose/
- **Google Cloud Run:** https://cloud.google.com/run/docs
- **Secret Manager:** https://cloud.google.com/secret-manager/docs
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **Netlify:** https://docs.netlify.com/
