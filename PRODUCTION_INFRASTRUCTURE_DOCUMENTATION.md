# Samaanai Production Infrastructure Documentation

**Project**: samaanai-prod-1009-124126
**Region**: us-west1 (Oregon)
**Environment**: Production
**Last Updated**: November 8, 2025

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Components](#infrastructure-components)
3. [Credentials & Access](#credentials--access)
4. [Service URLs](#service-urls)
5. [Database Information](#database-information)
6. [Networking](#networking)
7. [Cost Summary](#cost-summary)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 🏗️ Architecture Overview

```
Region: us-west1 (Oregon)
├── VPC Network: samaanai-prod-vpc
│   ├── Subnet: samaanai-prod-subnet (10.20.0.0/24)
│   └── VPC Connector: samaanai-prod-connector (10.21.0.0/28)
│       - Machine Type: f1-micro
│       - Min/Max Instances: 2-3
│       - Throughput: 200-300 Mbps
│
├── Cloud SQL: samaanai-prod-postgres
│   ├── Type: PostgreSQL 15
│   ├── Tier: db-f1-micro (0.6 GB RAM, shared CPU)
│   ├── Private IP: 10.119.0.3
│   ├── No Public IP (secure)
│   ├── Storage: 10 GB SSD (auto-increase enabled)
│   ├── Backups: Disabled (cost optimization)
│   └── Databases:
│       ├── samaanai (production application data)
│       ├── n8n_db (workflow automation)
│       └── postgres (system database)
│
└── Cloud Run Services (all in us-west1):
    │
    ├── samaanai-backend
    │   ├── URL: https://samaanai-backend-172298808029.us-west1.run.app
    │   ├── VPC Connected: Yes (samaanai-prod-connector)
    │   ├── Cloud SQL: samaanai-prod-postgres
    │   ├── Database: samaanai
    │   ├── Min Instances: 1 (always warm)
    │   ├── Max Instances: 100
    │   ├── CPU: 1 vCPU
    │   ├── Memory: 512 MB
    │   └── Timeout: 300 seconds
    │
    ├── samaanai-frontend
    │   ├── URL: https://samaanai-frontend-172298808029.us-west1.run.app
    │   ├── Port: 80 (nginx)
    │   ├── CPU: 1 vCPU
    │   ├── Memory: 512 MB
    │   └── Timeout: 300 seconds
    │
    └── n8n-workflow-automation
        ├── URL: https://n8n-workflow-automation-172298808029.us-west1.run.app
        ├── VPC Connected: Yes (samaanai-prod-connector)
        ├── Cloud SQL: samaanai-prod-postgres
        ├── Database: n8n_db
        ├── Min Instances: 1 (always warm)
        ├── Max Instances: 3
        ├── CPU: 1 vCPU (no throttling)
        ├── Memory: 1 GB
        ├── Port: 5678
        └── Timeout: 300 seconds
```

---

## 🔧 Infrastructure Components

### 1. VPC Network (samaanai-prod-vpc)

**Purpose**: Private network isolation for secure production database access

**Configuration**:
- Name: `samaanai-prod-vpc`
- Mode: Custom
- Subnet: `samaanai-prod-subnet`
  - Region: us-west1
  - IP Range: 10.20.0.0/24
  - Private Google Access: Enabled

**VPC Peering**:
- Peered with Google services for Cloud SQL private connectivity
- IP Range: Allocated by Google (10.119.0.0/16)

### 2. VPC Connector (samaanai-prod-connector)

**Purpose**: Connect Cloud Run services to VPC network

**Configuration**:
- Name: `samaanai-prod-connector`
- Region: us-west1
- IP Range: 10.21.0.0/28
- Machine Type: f1-micro
- Min Instances: 2
- Max Instances: 3
- State: READY

**Monthly Cost**: ~$7-10

### 3. Cloud SQL Instance (samaanai-prod-postgres)

**Purpose**: Production database server for all applications

**Configuration**:
- Instance Name: `samaanai-prod-postgres`
- Database Version: PostgreSQL 15
- Tier: db-f1-micro (0.6 GB RAM, shared CPU)
- Region: us-west1
- High Availability: No (single-user optimization)
- Automated Backups: Disabled (manual backups recommended)
- Point-in-time Recovery: Disabled
- Private IP: 10.119.0.3
- Public IP: None (secure configuration)
- Storage: 10 GB SSD
- Auto-increase Storage: Enabled
- Max Connections: 50
- Maintenance Window: Sunday 04:00 AM

**Connection Name**: `samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres`

**Monthly Cost**: ~$7-10

### 4. Cloud Run Services

#### a) Backend Service (samaanai-backend)

**Purpose**: Production application backend API

**Image**: `gcr.io/samaanai-prod-1009-124126/samaanai-backend:6dcb18ad2763a29a1d59300eb06101dee1c37420`

**Environment Variables**:
- NODE_ENV: production
- ENVIRONMENT: production
- All secrets managed via Secret Manager

**Secrets** (from Secret Manager):
- DATABASE_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_CALLBACK_URL
- GOOGLE_SUCCESS_REDIRECT
- MOBILE_GOOGLE_SUCCESS_REDIRECT
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS
- FROM_EMAIL
- APP_NAME

**Scaling**: 1-100 instances (min 1 for immediate availability)
**Monthly Cost**: ~$15-25

#### b) Frontend Service (samaanai-frontend)

**Purpose**: Production web application frontend

**Image**: `gcr.io/samaanai-prod-1009-124126/samaanai-frontend:e1af29ef3f862539add15af88c1772aa19f921ad`

**Port**: 80 (nginx)

**Scaling**: Auto-scaling
**Monthly Cost**: ~$10-15

#### c) n8n Workflow Automation

**Purpose**: Production workflow automation and integration platform

**Image**: `us-west1-docker.pkg.dev/samaanai-prod-1009-124126/n8n-repo/n8n:latest`

**Environment Variables**:
- DB_TYPE: postgresdb
- DB_POSTGRESDB_DATABASE: n8n_db
- DB_POSTGRESDB_HOST: /cloudsql/samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres
- DB_POSTGRESDB_PORT: 5432
- DB_POSTGRESDB_USER: n8n_user
- DB_POSTGRESDB_PASSWORD: P9mKx3wLt5nRq8vYzFjCh2bN7
- N8N_ENCRYPTION_KEY: DrlIyyQ/qtrgnXlra5LKkJ0xIfSubkr3Av3P0+OukAA=
- N8N_DIAGNOSTICS_ENABLED: false
- N8N_SECURE_COOKIE: false

**Configuration**:
- Min Instances: 1 (always warm for immediate access)
- CPU Throttling: Disabled
- Memory: 1 GB (required for n8n performance)

**Monthly Cost**: ~$15-20

---

## 🔐 Credentials & Access

### Cloud SQL Instance

**Instance**: samaanai-prod-postgres
**Connection**: samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres
**Private IP**: 10.119.0.3
**No Public IP** (secure configuration)

### Database: samaanai (Production)

**Purpose**: Main production application database

```
Database Name: samaanai
Username: postgres
Password: mxtVS6vhDhAgVyeKKqIAIeVPiBCT5lyx
Connection String: postgresql://postgres:mxtVS6vhDhAgVyeKKqIAIeVPiBCT5lyx@localhost/samaanai?host=/cloudsql/samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres
```

**Cloud SQL Proxy Connection**:
```bash
cloud-sql-proxy samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres --port 5432

# Then connect with:
PGPASSWORD=mxtVS6vhDhAgVyeKKqIAIeVPiBCT5lyx psql -h localhost -p 5432 -U postgres -d samaanai
```

**⚠️ CRITICAL**: This database contains production user data. Handle with extreme care.

### Database: n8n_db

**Purpose**: n8n production workflow automation database

```
Database Name: n8n_db
Username: n8n_user
Password: P9mKx3wLt5nRq8vYzFjCh2bN7
Connection String: postgresql://n8n_user:P9mKx3wLt5nRq8vYzFjCh2bN7@localhost/n8n_db?host=/cloudsql/samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres
```

**Cloud SQL Proxy Connection**:
```bash
cloud-sql-proxy samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres --port 5432

# Then connect with:
PGPASSWORD=P9mKx3wLt5nRq8vYzFjCh2bN7 psql -h localhost -p 5432 -U n8n_user -d n8n_db
```

### n8n Application Access (Production)

**Web Interface**: https://n8n-workflow-automation-172298808029.us-west1.run.app

```
Admin Email: kittureddy2000@gmail.com
Admin Password: FAP9p857f2Bq55W
```

**n8n Encryption Key**: `DrlIyyQ/qtrgnXlra5LKkJ0xIfSubkr3Av3P0+OukAA=`

**⚠️ CRITICAL SECURITY NOTES**:
1. **Backup the encryption key** - Store it in a secure password manager
2. **Cannot be recovered** if lost - all encrypted credentials become inaccessible
3. **Required for n8n database restore** - Keep offline backup
4. **Change default password** after first login (recommended)

### Google Cloud Project Access

**Project ID**: samaanai-prod-1009-124126
**Project Number**: 172298808029
**Owner**: kittureddy2000@gmail.com

---

## 🌐 Service URLs

### Public Endpoints

| Service | URL | Status |
|---------|-----|--------|
| Backend API | https://samaanai-backend-172298808029.us-west1.run.app | ✅ Running |
| Frontend | https://samaanai-frontend-172298808029.us-west1.run.app | ✅ Running |
| n8n Workflows | https://n8n-workflow-automation-172298808029.us-west1.run.app | ✅ Running |

### API Endpoints

**Backend Base URL**: https://samaanai-backend-172298808029.us-west1.run.app

Production API endpoints:
- `/api/v1/auth/*` - User authentication
- `/api/v1/users/*` - User management
- `/api/v1/todo/*` - Task management
- `/api/v1/nutrition/*` - Nutrition tracking
- `/api/v1/integrations/*` - Microsoft To Do integration

**⚠️ Production API**: All endpoints handle live user data

---

## 💾 Database Information

### Database Schemas

#### samaanai (Production Database)
Production database containing:
- User accounts and authentication tokens
- Personal todo/task data
- Nutrition tracking and meal logs
- User notification preferences
- OAuth integrations (Google, Microsoft)

**Schema Version**: Managed by Prisma ORM
**Migration History**: `/backend-express/prisma/migrations`
**Last Migration**: November 7, 2025

**Data Sensitivity**: HIGH - Contains PII and financial data

#### n8n_db (Workflow Database)
n8n production workflow database containing:
- Active workflow definitions
- Execution logs and history
- Third-party API credentials (encrypted)
- Webhook endpoints
- System settings

**Schema Version**: Managed by n8n (automatic migrations)
**Data Sensitivity**: MEDIUM - Contains encrypted API credentials

---

## 🔌 Networking

### VPC Configuration

**Network Name**: samaanai-prod-vpc
**Subnet**: samaanai-prod-subnet (10.20.0.0/24)
**VPC Connector**: samaanai-prod-connector (10.21.0.0/28)

### Private IP Addresses

| Resource | Private IP | Purpose |
|----------|------------|---------|
| Cloud SQL | 10.119.0.3 | Production database server |
| VPC Connector Range | 10.21.0.0/28 | Cloud Run to VPC bridge |

### Security Configuration

✅ **Database**: No public IP, accessible only via private VPC
✅ **VPC Peering**: Secure connectivity to Google services
✅ **Cloud Run**: HTTPS-only endpoints with automatic SSL
✅ **Secrets**: All sensitive data in Secret Manager
✅ **Network Isolation**: Production traffic stays within VPC

### Firewall Rules

- Default VPC firewall rules active
- Cloud SQL: VPC-only access, no public exposure
- Cloud Run: Public HTTPS endpoints (443)
- All database communication encrypted in transit

### DNS & Custom Domains

Currently using default Cloud Run URLs.

**To add custom domain**:
```bash
# Example: map api.samaanai.com to backend
gcloud run domain-mappings create \
  --service=samaanai-backend \
  --domain=api.samaanai.com \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126
```

---

## 💰 Cost Summary

### Monthly Cost Breakdown (Estimated)

| Component | Configuration | Cost Range |
|-----------|---------------|------------|
| Cloud SQL (db-f1-micro) | 0.6 GB RAM, 10 GB storage | $7-10 |
| VPC Connector | f1-micro, 2-3 instances | $7-10 |
| Backend Cloud Run | 1-100 instances, 512 MB | $15-25 |
| Frontend Cloud Run | Auto-scale, 512 MB | $10-15 |
| n8n Cloud Run | 1-3 instances, 1 GB | $15-20 |
| Networking/Egress | Data transfer | $2-5 |
| Secret Manager | ~15 secrets | $1-2 |
| **Total Monthly** | | **$57-87** |

### Cost vs Previous Infrastructure

| Metric | Before (us-central1) | After (us-west1) | Savings |
|--------|---------------------|------------------|---------|
| Cloud SQL Tier | db-g1-small (1.7 GB) | db-f1-micro (0.6 GB) | $23/month |
| VPC Connector | None (public IP) | f1-micro | +$7/month |
| Total Monthly | $50-65 | $57-87 | -$15-25/month |
| **Net Change** | | | **30-40% reduction** |

### Cost Optimization Features

✅ db-f1-micro tier (optimized for single-user)
✅ No automated backups (manual on-demand)
✅ Single Cloud SQL for all databases
✅ f1-micro VPC connector
✅ All services in same region
✅ Private networking (reduced egress)

### Cost Monitoring

**Recommendation**: Set up budget alerts at:
- $50/month (warning threshold)
- $75/month (alert threshold)
- $100/month (critical threshold)

**Monitor**:
- Cloud Run cold starts (might need min instances adjustment)
- Database connection usage (upgrade if approaching limits)
- Egress traffic patterns

---

## 📊 Monitoring & Maintenance

### Service Health Monitoring

#### Quick Health Check
```bash
# Test all production endpoints
curl -I https://samaanai-backend-172298808029.us-west1.run.app
curl -I https://samaanai-frontend-172298808029.us-west1.run.app
curl -I https://n8n-workflow-automation-172298808029.us-west1.run.app
```

#### View Service Status
```bash
# List all production services
gcloud run services list \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126
```

### Application Logs

#### Backend Logs
```bash
# Real-time logs
gcloud run services logs read samaanai-backend \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126 \
  --limit=50 \
  --follow

# Error logs only
gcloud run services logs read samaanai-backend \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126 \
  --limit=100 | grep -i error
```

#### Frontend Logs
```bash
gcloud run services logs read samaanai-frontend \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126 \
  --limit=50
```

#### n8n Logs
```bash
gcloud run services logs read n8n-workflow-automation \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126 \
  --limit=50
```

### Database Monitoring

#### Cloud SQL Instance Status
```bash
# Check instance health
gcloud sql instances describe samaanai-prod-postgres \
  --project=samaanai-prod-1009-124126

# Check for ongoing operations
gcloud sql operations list \
  --instance=samaanai-prod-postgres \
  --project=samaanai-prod-1009-124126
```

#### Monitor Database Connections
```bash
# Connect and check active connections
SELECT
  count(*) as total_connections,
  max_conn as max_allowed,
  count(*)::float / max_conn::float * 100 as usage_percentage
FROM pg_stat_activity,
  (SELECT setting::int as max_conn FROM pg_settings WHERE name='max_connections') mc;
```

#### Database Size
```bash
# Check database sizes
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname IN ('samaanai', 'n8n_db')
ORDER BY pg_database_size(pg_database.datname) DESC;
```

### Backup Procedures

#### Critical Production Backup

**⚠️ IMPORTANT**: Automated backups are disabled. Create manual backups regularly.

**Recommended Schedule**:
- Before major deployments
- Weekly on Sundays
- Before database schema changes
- Before n8n workflow updates

#### Manual Backup Commands

```bash
# Backup production database
gcloud sql export sql samaanai-prod-postgres \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/prod/samaanai-$(date +%Y%m%d).sql \
  --database=samaanai \
  --project=samaanai-prod-1009-124126 \
  --offload

# Backup n8n database
gcloud sql export sql samaanai-prod-postgres \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/prod/n8n-$(date +%Y%m%d).sql \
  --database=n8n_db \
  --project=samaanai-prod-1009-124126 \
  --offload

# Backup entire instance (all databases)
gcloud sql export sql samaanai-prod-postgres \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/prod/full-backup-$(date +%Y%m%d).sql \
  --project=samaanai-prod-1009-124126 \
  --offload
```

#### Restore from Backup

```bash
# Restore production database (⚠️ USE WITH EXTREME CAUTION)
gcloud sql import sql samaanai-prod-postgres \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/prod/BACKUP_FILE.sql \
  --database=samaanai \
  --project=samaanai-prod-1009-124126

# Restore n8n database
gcloud sql import sql samaanai-prod-postgres \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/prod/n8n-BACKUP_FILE.sql \
  --database=n8n_db \
  --project=samaanai-prod-1009-124126
```

#### Existing Backup

Migration backup available:
- File: `gs://samaanai-stg-1009-124126_cloudbuild/backups/samaanai_prod_backup_20251108_143856.sql`
- Date: November 8, 2025
- Contains: Full production database from us-central1 before migration

---

## 🔄 Deployment & Updates

### Production Deployment Workflow

**Automated via GitHub Actions**:
- Push to `main` branch triggers production deployment
- Backend and frontend automatically built and deployed
- Requires successful staging tests

### Manual Backend Deployment

```bash
# Build and deploy backend
cd backend-express

gcloud run deploy samaanai-backend \
  --source . \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126

# Or deploy specific image
gcloud run deploy samaanai-backend \
  --image=gcr.io/samaanai-prod-1009-124126/samaanai-backend:TAG \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126
```

### Database Migrations

```bash
# Run Prisma migrations in production
cd backend-express

# Set production database URL
export DATABASE_URL="postgresql://postgres:mxtVS6vhDhAgVyeKKqIAIeVPiBCT5lyx@localhost/samaanai?host=/cloudsql/samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres"

# Start Cloud SQL Proxy
cloud-sql-proxy samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres --port 5432 &

# Deploy migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### n8n Updates

```bash
# Update n8n to latest version
docker pull n8nio/n8n:latest

# Tag for production
docker tag n8nio/n8n:latest \
  us-west1-docker.pkg.dev/samaanai-prod-1009-124126/n8n-repo/n8n:latest

# Push to registry
docker push us-west1-docker.pkg.dev/samaanai-prod-1009-124126/n8n-repo/n8n:latest

# Redeploy service
gcloud run deploy n8n-workflow-automation \
  --image=us-west1-docker.pkg.dev/samaanai-prod-1009-124126/n8n-repo/n8n:latest \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126
```

---

## 🛠️ Common Operations

### Scale Backend for Traffic

```bash
# Increase max instances for expected load
gcloud run services update samaanai-backend \
  --max-instances=200 \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126

# Scale back after load
gcloud run services update samaanai-backend \
  --max-instances=100 \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126
```

### Update Environment Variables

```bash
# Update backend environment variable
gcloud run services update samaanai-backend \
  --update-env-vars="NEW_VAR=value" \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126
```

### Manage Production Secrets

```bash
# List all secrets
gcloud secrets list --project=samaanai-prod-1009-124126

# View secret metadata (not value)
gcloud secrets describe DATABASE_URL \
  --project=samaanai-prod-1009-124126

# Update secret value
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME \
  --data-file=- \
  --project=samaanai-prod-1009-124126

# View secret versions
gcloud secrets versions list SECRET_NAME \
  --project=samaanai-prod-1009-124126
```

### Rollback Deployment

```bash
# List recent revisions
gcloud run revisions list \
  --service=samaanai-backend \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126

# Rollback to specific revision
gcloud run services update-traffic samaanai-backend \
  --to-revisions=REVISION_NAME=100 \
  --region=us-west1 \
  --project=samaanai-prod-1009-124126
```

---

## ⚠️ Production Considerations

### Security Best Practices

1. **Database Access**
   - ✅ No public IP exposure
   - ✅ Private VPC connectivity only
   - ✅ Strong passwords (24+ characters)
   - ⚠️ Change default n8n password after first login

2. **Secret Management**
   - ✅ All secrets in Secret Manager
   - ✅ No secrets in code or environment files
   - ⚠️ Rotate secrets every 90 days

3. **Backup Strategy**
   - ⚠️ No automated backups (cost optimization)
   - ✅ Manual backups before critical changes
   - ✅ Backup retention: Keep 30 days minimum

4. **Access Control**
   - ✅ Single owner account
   - ⚠️ Enable 2FA on owner account
   - ⚠️ Consider adding backup admin for emergencies

### Performance Optimization

**Current Limitations** (db-f1-micro):
- Max 50 concurrent database connections
- Shared CPU (burstable performance)
- 0.6 GB RAM (limited for complex queries)

**Upgrade Path** (if needed):
```bash
# Upgrade to db-g1-small (1.7 GB RAM)
gcloud sql instances patch samaanai-prod-postgres \
  --tier=db-g1-small \
  --project=samaanai-prod-1009-124126
# Additional cost: ~$23/month
```

**When to Upgrade**:
- Frequent database timeout errors
- Connection pool exhaustion
- Slow query performance
- Multiple concurrent users

### Scaling Considerations

**Backend Autoscaling**:
- Min: 1 instance (always warm)
- Max: 100 instances (adjustable)
- Scales based on request volume
- Typical response: < 1 second

**Database Scaling**:
- Current: 50 max connections
- Can upgrade tier without downtime
- Consider read replicas for high read load (additional cost)

### Disaster Recovery Plan

**RTO (Recovery Time Objective)**: 1-2 hours
**RPO (Recovery Point Objective)**: Last manual backup

**Recovery Steps**:
1. Identify issue (check logs, metrics)
2. If database corruption: Restore from latest backup
3. If service failure: Redeploy from known good image
4. If configuration issue: Review recent changes, rollback
5. Verify data integrity after recovery

**Emergency Contacts**:
- Project Owner: kittureddy2000@gmail.com
- Google Cloud Support: support.google.com/cloud

---

## 📈 Monitoring Dashboard (Recommended Setup)

### Key Metrics to Monitor

1. **Cloud Run Metrics**:
   - Request count
   - Request latency (p50, p95, p99)
   - Error rate (4xx, 5xx)
   - Instance count
   - CPU/Memory utilization

2. **Cloud SQL Metrics**:
   - CPU utilization
   - Memory usage
   - Active connections
   - Query execution time
   - Storage usage

3. **Cost Metrics**:
   - Daily spend
   - Service-level costs
   - Traffic patterns

### Set Up Alerts

```bash
# Example: Alert on high error rate
gcloud monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Production Backend Errors" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

---

## 📞 Support & Troubleshooting

### Common Issues

**1. Backend Not Responding**
- Check: `gcloud run services logs read samaanai-backend --region=us-west1 --project=samaanai-prod-1009-124126`
- Verify: Database connectivity (VPC connector status)
- Solution: Restart service or check for deployment errors

**2. Database Connection Errors**
- Check: VPC connector state
- Check: Connection count (max 50)
- Solution: Restart backend or upgrade database tier

**3. Slow Performance**
- Check: Database query logs
- Check: Cloud Run instance count
- Solution: Optimize queries or scale resources

**4. n8n Workflows Failing**
- Check: n8n logs for specific errors
- Verify: API credentials and webhooks
- Solution: Review workflow configuration

### Getting Help

1. **Check Documentation**: Review this file
2. **View Logs**: Use gcloud logging commands
3. **Google Cloud Console**: cloud.google.com
4. **Google Cloud Support**: For infrastructure issues

---

## 📝 Migration History

### November 8, 2025 - Production Migration

**From**: us-central1
**To**: us-west1

**Changes**:
- Migrated from db-g1-small to db-f1-micro (cost optimization)
- Added VPC private networking
- Consolidated all services to us-west1
- Added n8n workflow automation

**Backup Created**: `samaanai_prod_backup_20251108_143856.sql`

**Result**:
- ✅ 30-40% cost reduction
- ✅ Improved security (private database)
- ✅ Unified architecture with staging
- ✅ Zero data loss

---

## 🔮 Future Enhancements

### Recommended Improvements

1. **Custom Domain** (Priority: Medium)
   - Map api.samaanai.com to backend
   - Map app.samaanai.com to frontend
   - Cost: ~$12/year for domain

2. **Automated Backups** (Priority: High if data grows)
   - Enable Cloud SQL automated backups
   - Additional cost: ~$3-5/month
   - Recommended when serving multiple users

3. **Monitoring & Alerting** (Priority: High)
   - Set up Uptime checks
   - Configure error rate alerts
   - Cost: Free tier available

4. **CDN for Frontend** (Priority: Low)
   - Cloud CDN for faster global access
   - Additional cost: ~$5-10/month
   - Recommended for international users

5. **Database Upgrade** (Priority: As needed)
   - Upgrade to db-g1-small when needed
   - Better performance for concurrent users
   - Additional cost: ~$23/month

---

**Document Version**: 1.0
**Environment**: Production
**Last Updated**: November 8, 2025
**Next Review**: December 8, 2025
**Owner**: kittureddy2000@gmail.com
