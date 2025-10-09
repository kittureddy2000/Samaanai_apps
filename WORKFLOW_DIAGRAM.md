# 🔄 CI/CD Workflow Diagram - Samaanai

Visual guide to understanding the deployment pipeline.

## 🌊 Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Developer Workflow                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Feature    │
│  Development │  Developer creates feature branch
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Pull Request │  Create PR: feature/* → staging
│  to Staging  │
└──────┬───────┘
       │
       │ Merge ✓
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Staging Branch                               │
│                                                                  │
│  📦 Project: samaanai-staging                                   │
│  🚀 Service: samaanai-backend-staging                          │
│  💰 Resources: 512MB, 0-10 instances                           │
└──────┬───────────────────────────────────────────────────────────┘
       │
       │ GitHub Actions Triggered
       ▼
┌──────────────────────────────────────────────────────────────────┐
│              Automated CI/CD Pipeline                            │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│  │   Test   │ ─→ │  Build   │ ─→ │  Deploy  │                 │
│  └──────────┘    └──────────┘    └──────────┘                 │
│       │               │                │                        │
│   Run Tests      Build Docker    Deploy to GCP                 │
│   ✓ Pass         Push to GCR     Run Migrations                │
│                                   Health Check                  │
└──────┬───────────────────────────────────────────────────────────┘
       │
       │ Deployment Complete
       ▼
┌──────────────┐
│   Staging    │  🧪 Test in staging environment
│  Environment │  URL: https://samaanai-backend-staging-xxx.run.app
└──────┬───────┘
       │
       │ QA & Testing
       │ ✓ All tests pass
       │ ✓ Manual verification
       ▼
┌──────────────┐
│ Pull Request │  Create PR: staging → main
│ to Production│
└──────┬───────┘
       │
       │ Code Review & Approval
       │ Merge ✓
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Main Branch (Production)                     │
│                                                                  │
│  📦 Project: samaanai-prod                                      │
│  🚀 Service: samaanai-backend                                   │
│  💰 Resources: 1GB, 1-100 instances                             │
└──────┬───────────────────────────────────────────────────────────┘
       │
       │ GitHub Actions Triggered
       ▼
┌──────────────────────────────────────────────────────────────────┐
│              Automated CI/CD Pipeline                            │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│  │   Test   │ ─→ │  Build   │ ─→ │  Deploy  │                 │
│  └──────────┘    └──────────┘    └──────────┘                 │
│       │               │                │                        │
│   Run Tests      Build Docker    Deploy to GCP                 │
│   ✓ Pass         Push to GCR     Run Migrations                │
│                                   Health Check                  │
└──────┬───────────────────────────────────────────────────────────┘
       │
       │ Deployment Complete
       ▼
┌──────────────┐
│ Production   │  🎉 Live to users!
│ Environment  │  URL: https://samaanai-backend-xxx.run.app
└──────────────┘
```

## 🔀 Branch Strategy

```
main (🚀 Production)
  ├─── Always deployable
  ├─── Protected branch
  └─── Requires PR review
       ↑
       │ PR & Review
       │
staging (🧪 Staging)
  ├─── Pre-production testing
  ├─── Integration testing
  └─── QA validation
       ↑
       │ PR from feature branches
       │
feature/new-feature (💻 Development)
feature/bug-fix
feature/enhancement
  └─── Active development
```

## 🎯 Trigger Matrix

| Git Action | Branch | Environment | Auto-Deploy | Resource Config |
|------------|--------|-------------|-------------|-----------------|
| Push | `staging` | Staging | ✅ Yes | 512MB, 0 min |
| Push | `main` | Production | ✅ Yes | 1GB, 1 min |
| Manual | Any | Staging | ⚙️ Manual | 512MB, 0 min |
| Manual | Any | Production | ⚙️ Manual | 1GB, 1 min |

## 🔄 GitHub Actions Workflow Steps

### Job 1: Setup (Determine Environment)

```
┌─────────────────────────────────────┐
│         Setup Environment           │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Check Trigger Type         │   │
│  │  - Push to main? → prod     │   │
│  │  - Push to staging? → stage │   │
│  │  - Manual? → user choice    │   │
│  └─────────────────────────────┘   │
│           ↓                         │
│  ┌─────────────────────────────┐   │
│  │  Set Environment Variables  │   │
│  │  - project-id               │   │
│  │  - service-name             │   │
│  │  - environment              │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
          ↓
   Output to Test & Deploy jobs
```

### Job 2: Test

```
┌─────────────────────────────────────┐
│          Run Tests                  │
├─────────────────────────────────────┤
│                                     │
│  1. Checkout code                   │
│  2. Setup Node.js 18                │
│  3. Install dependencies            │
│  4. Generate Prisma Client          │
│  5. Run npm test                    │
│                                     │
│  ✓ Tests must pass to continue      │
│                                     │
└─────────────────────────────────────┘
          ↓
   Tests passed? Continue to Deploy
```

### Job 3: Deploy

```
┌─────────────────────────────────────────────────────┐
│               Build & Deploy                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Checkout code                                   │
│  2. Authenticate to GCP                             │
│     ├─ Use staging SA key (if staging)             │
│     └─ Use production SA key (if prod)             │
│                                                     │
│  3. Configure Docker for GCR                        │
│                                                     │
│  4. Build Docker Image                              │
│     ├─ Tag: commit-sha                             │
│     ├─ Tag: latest                                 │
│     └─ Tag: environment (staging/production)       │
│                                                     │
│  5. Push Docker Image to GCR                        │
│                                                     │
│  6. Deploy to Cloud Run                             │
│     ├─ Set environment variables                   │
│     ├─ Inject secrets from Secret Manager         │
│     ├─ Configure resources (based on env)          │
│     └─ Set labels and metadata                     │
│                                                     │
│  7. Run Database Migrations                         │
│     ├─ Create Cloud Run Job                       │
│     ├─ Execute: npx prisma migrate deploy         │
│     └─ Clean up job                               │
│                                                     │
│  8. Get Service URL                                 │
│                                                     │
│  9. Health Check                                    │
│     ├─ Wait 15 seconds                            │
│     └─ Curl /health endpoint                      │
│                                                     │
│  ✅ Deployment Complete                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🔐 Secrets Flow

### GitHub Secrets → GCP Secret Manager

```
┌──────────────────────────────────────────────────┐
│            GitHub Repository Secrets             │
├──────────────────────────────────────────────────┤
│                                                  │
│  GCP_PROJECT_ID_STAGING ──┐                     │
│  GCP_PROJECT_ID_PROD ──────┼─→ Project Selection│
│                             │                     │
│  GCP_SA_KEY_STAGING ───────┼─→ Authentication   │
│  GCP_SA_KEY_PROD ──────────┘                     │
│                                                  │
└──────────────────────────────────────────────────┘
                    ↓
          GitHub Actions Workflow
                    ↓
┌──────────────────────────────────────────────────┐
│         Google Cloud Secret Manager              │
├──────────────────────────────────────────────────┤
│                                                  │
│  Staging Project Secrets:                        │
│  ├─ DATABASE_URL                                 │
│  ├─ JWT_SECRET                                   │
│  ├─ JWT_REFRESH_SECRET                           │
│  ├─ GOOGLE_CLIENT_ID                             │
│  └─ GOOGLE_CLIENT_SECRET                         │
│                                                  │
│  Production Project Secrets:                     │
│  ├─ DATABASE_URL                                 │
│  ├─ JWT_SECRET                                   │
│  ├─ JWT_REFRESH_SECRET                           │
│  ├─ GOOGLE_CLIENT_ID                             │
│  └─ GOOGLE_CLIENT_SECRET                         │
│                                                  │
└──────────────────────────────────────────────────┘
                    ↓
         Injected into Cloud Run Service
                    ↓
┌──────────────────────────────────────────────────┐
│           Running Container                      │
├──────────────────────────────────────────────────┤
│  Secrets available as environment variables      │
│  process.env.DATABASE_URL                        │
│  process.env.JWT_SECRET                          │
│  etc.                                            │
└──────────────────────────────────────────────────┘
```

## 🏗️ Resource Configuration

### Staging Environment

```
┌─────────────────────────────────────┐
│   Staging Configuration             │
├─────────────────────────────────────┤
│  Memory:        512Mi               │
│  CPU:           1 vCPU              │
│  Min Instances: 0 (no idle cost)    │
│  Max Instances: 10                  │
│  Concurrency:   80                  │
│  Timeout:       300s                │
│                                     │
│  💰 Cost: ~$0-5/month               │
│  🎯 Purpose: Testing                │
└─────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────┐
│  Production Configuration           │
├─────────────────────────────────────┤
│  Memory:        1Gi                 │
│  CPU:           1 vCPU              │
│  Min Instances: 1 (no cold starts)  │
│  Max Instances: 100                 │
│  Concurrency:   80                  │
│  Timeout:       300s                │
│                                     │
│  💰 Cost: ~$10-30/month             │
│  🎯 Purpose: Live users             │
└─────────────────────────────────────┘
```

## 📊 Deployment Timeline

### Typical Deployment Duration

```
0:00  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Start
0:30  ├─ Checkout & Setup             │
1:00  ├─ Run Tests ──────────────────┐ │
2:00  │                               ├─┤  Total: ~3-5 min
2:30  ├─ Build Docker Image ─────────┤ │
3:00  ├─ Push to GCR                 │ │
3:30  ├─ Deploy to Cloud Run         │ │
4:00  ├─ Run Migrations              │ │
4:30  ├─ Health Check               ─┘ │
5:00  └─ Complete ━━━━━━━━━━━━━━━━━━━━┘
```

## 🔄 Rollback Process

```
┌─────────────────────────────────────┐
│    Deployment Issue Detected        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  List Available Revisions           │
│  $ gcloud run revisions list        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Route 100% Traffic to Previous     │
│  $ gcloud run services update-      │
│    traffic ... --to-revisions ...   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Service Restored                   │
│  ✓ Users see previous version       │
└─────────────────────────────────────┘
```

## 🎨 Environment Labels

All deployed services are tagged with labels:

```yaml
Labels:
  environment: staging | production
  app: samaanai
  component: backend
  managed-by: github-actions
```

Use labels for:
- Cost tracking
- Resource organization
- Automated operations
- Monitoring and alerting

## 📈 Scaling Behavior

### Staging (Cost-Optimized)

```
Instances
    10 ┤                    ╭─╮
     9 ┤                 ╭──╯ ╰──╮
     8 ┤              ╭──╯       ╰─╮
     7 ┤           ╭──╯            ╰─╮
     6 ┤        ╭──╯                 ╰──╮
     5 ┤     ╭──╯                       ╰─╮
     4 ┤  ╭──╯                            ╰─╮
     3 ┤╭─╯                                 ╰─╮
     2 ┼╯                                     ╰─╮
     1 ┤                                        ╰─╮
     0 ┤───────────────────────────────────────────
       0     Traffic increases/decreases          Time

     Scale to 0 when no traffic
     Scale up based on demand (max 10)
```

### Production (Reliability-Focused)

```
Instances
   100 ┤                              ╭─╮
    90 ┤                           ╭──╯ ╰─╮
    80 ┤                        ╭──╯      ╰─╮
       ┤                     ╭──╯           ╰─╮
       ┤                  ╭──╯                ╰──╮
       ┤               ╭──╯                      ╰─╮
       ┤            ╭──╯                           ╰─╮
       ┤         ╭──╯                                ╰─╮
       ┤      ╭──╯                                     ╰─╮
    10 ┤   ╭──╯                                          ╰─╮
     1 ┼───────────────────────────────────────────────────
       0           Traffic increases/decreases           Time

     Always 1 instance minimum (no cold starts)
     Scale up to 100 based on demand
```

## 🎯 Success Criteria

### Staging Deployment ✓

- [x] Tests passed
- [x] Docker image built
- [x] Pushed to GCR
- [x] Deployed to Cloud Run
- [x] Migrations executed
- [x] Health check passed
- [x] Service URL accessible

### Production Deployment ✓

- [x] All staging criteria met
- [x] Staging thoroughly tested
- [x] Code reviewed and approved
- [x] Production secrets configured
- [x] Monitoring enabled
- [x] Rollback plan ready

---

**Last Updated:** 2025-10-05
**Version:** 2.0.0
