# Samaanai Staging Infrastructure Documentation

**Project**: samaanai-stg-1009-124126
**Region**: us-west1 (Oregon)
**Environment**: Staging
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
├── VPC Network: n8n-network
│   ├── Subnet: n8n-subnet (10.10.0.0/24)
│   └── VPC Connector: n8n-vpc-connector (10.11.0.0/28)
│       - Machine Type: f1-micro
│       - Min/Max Instances: 2-3
│       - Throughput: 200-300 Mbps
│
├── Cloud SQL: n8n-postgres-instance
│   ├── Type: PostgreSQL 15
│   ├── Tier: db-f1-micro (0.6 GB RAM, shared CPU)
│   ├── Private IP: 10.201.0.3
│   ├── No Public IP (secure)
│   ├── Storage: 10 GB SSD (auto-increase enabled)
│   ├── Backups: Disabled (cost optimization)
│   └── Databases:
│       ├── n8n_db (workflow automation)
│       ├── samaanai_staging (backend application)
│       └── postgres (system database)
│
└── Cloud Run Services (all in us-west1):
    │
    ├── samaanai-backend-staging
    │   ├── URL: https://samaanai-backend-staging-362270100637.us-west1.run.app
    │   ├── VPC Connected: Yes (n8n-vpc-connector)
    │   ├── Cloud SQL: n8n-postgres-instance
    │   ├── Database: samaanai_staging
    │   ├── Min Instances: 0 (scales to zero)
    │   ├── Max Instances: 10
    │   ├── CPU: 1 vCPU
    │   ├── Memory: 512 MB
    │   └── Timeout: 300 seconds
    │
    ├── samaanai-frontend-staging
    │   ├── URL: https://samaanai-frontend-staging-362270100637.us-west1.run.app
    │   ├── Port: 80 (nginx)
    │   ├── CPU: 1 vCPU
    │   ├── Memory: 512 MB
    │   └── Timeout: 300 seconds
    │
    └── n8n-workflow-automation
        ├── URL: https://n8n-workflow-automation-362270100637.us-west1.run.app
        ├── VPC Connected: Yes (n8n-vpc-connector)
        ├── Cloud SQL: n8n-postgres-instance
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

### 1. VPC Network (n8n-network)

**Purpose**: Private network isolation for secure database access

**Configuration**:
- Name: `n8n-network`
- Mode: Custom
- Subnet: `n8n-subnet`
  - Region: us-west1
  - IP Range: 10.10.0.0/24
  - Private Google Access: Enabled

**VPC Peering**:
- Peered with Google services for Cloud SQL private connectivity
- IP Range: Allocated by Google (10.201.0.0/16)

### 2. VPC Connector (n8n-vpc-connector)

**Purpose**: Connect Cloud Run services to VPC network

**Configuration**:
- Name: `n8n-vpc-connector`
- Region: us-west1
- IP Range: 10.11.0.0/28
- Machine Type: f1-micro
- Min Instances: 2
- Max Instances: 3
- State: READY

**Monthly Cost**: ~$7-10

### 3. Cloud SQL Instance (samaanai-backend-staging-db)

**Purpose**: Unified database server for all applications

**Configuration**:
- Instance Name: `samaanai-backend-staging-db`
- Database Version: PostgreSQL 15
- Tier: db-f1-micro (0.6 GB RAM, shared CPU)
- Region: us-west1-c
- High Availability: No (cost optimization)
- Automated Backups: Disabled (cost optimization)
- Point-in-time Recovery: Disabled
- Private IP: 10.201.0.3
- Public IP: None (secure configuration)
- Storage: 10 GB SSD
- Auto-increase Storage: Enabled
- Max Connections: 50

**Connection Name**: `samaanai-stg-1009-124126:us-west1:n8n-postgres-instance`

**Monthly Cost**: ~$7-10

### 4. Cloud Run Services

#### a) Backend Service (samaanai-backend-staging)

**Purpose**: Main application backend API

**Image**: `gcr.io/samaanai-stg-1009-124126/samaanai-backend-staging:f9297c4d8f9ff29f35188f9ecb1d7dabc22a8f5d`

**Environment Variables**:
- NODE_ENV: staging
- ENVIRONMENT: staging
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

**Scaling**: 0-10 instances
**Monthly Cost**: ~$10-15

#### b) Frontend Service (samaanai-frontend-staging)

**Purpose**: Web application frontend

**Image**: Latest deployment via GitHub Actions

**Port**: 80 (nginx)

**Scaling**: Auto-scaling
**Monthly Cost**: ~$5-10

#### c) n8n Workflow Automation

**Purpose**: Workflow automation and integration platform

**Image**: `us-west1-docker.pkg.dev/samaanai-stg-1009-124126/n8n-repo/n8n:latest`

**Environment Variables**:
- DB_TYPE: postgresdb
- DB_POSTGRESDB_DATABASE: n8n_db
- DB_POSTGRESDB_HOST: /cloudsql/samaanai-stg-1009-124126:us-west1:n8n-postgres-instance
- DB_POSTGRESDB_PORT: 5432
- DB_POSTGRESDB_USER: n8n_user
- DB_POSTGRESDB_PASSWORD: L2tZD8Fwc0m0c6eMv2i6qfzUh
- N8N_ENCRYPTION_KEY: 16w6I2rRS3xQ/HiwOA0rXzYnn9umpaIQINFfII4amM4=
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

**Instance**: n8n-postgres-instance
**Connection**: samaanai-stg-1009-124126:us-west1:n8n-postgres-instance
**Private IP**: 10.201.0.3

### Database: samaanai_staging

**Purpose**: Backend application database

```
Database Name: samaanai_staging
Username: postgres
Password: ajdIuZuLj9bNsg5Nnm9VkS3BkoHUrYEi
Connection String: postgresql://postgres:ajdIuZuLj9bNsg5Nnm9VkS3BkoHUrYEi@localhost/samaanai_staging?host=/cloudsql/samaanai-stg-1009-124126:us-west1:n8n-postgres-instance
```

**Cloud SQL Proxy Connection**:
```bash
cloud-sql-proxy samaanai-stg-1009-124126:us-west1:n8n-postgres-instance --port 5433

# Then connect with:
PGPASSWORD=ajdIuZuLj9bNsg5Nnm9VkS3BkoHUrYEi psql -h localhost -p 5433 -U postgres -d samaanai_staging
```

### Database: n8n_db

**Purpose**: n8n workflow automation database

```
Database Name: n8n_db
Username: n8n_user
Password: L2tZD8Fwc0m0c6eMv2i6qfzUh
Connection String: postgresql://n8n_user:L2tZD8Fwc0m0c6eMv2i6qfzUh@localhost/n8n_db?host=/cloudsql/samaanai-stg-1009-124126:us-west1:n8n-postgres-instance
```

**Cloud SQL Proxy Connection**:
```bash
cloud-sql-proxy samaanai-stg-1009-124126:us-west1:n8n-postgres-instance --port 5433

# Then connect with:
PGPASSWORD=L2tZD8Fwc0m0c6eMv2i6qfzUh psql -h localhost -p 5433 -U n8n_user -d n8n_db
```

### n8n Application Access

**Web Interface**: https://n8n-workflow-automation-362270100637.us-west1.run.app

```
Admin Email: kittureddy2000@gmail.com
Admin Password: Vtnkpv55!@#
```

**n8n Encryption Key**: `16w6I2rRS3xQ/HiwOA0rXzYnn9umpaIQINFfII4amM4=`

**IMPORTANT**: Store the encryption key securely. It's required for decrypting credentials and cannot be recovered if lost.

### Google Cloud Project Access

**Project ID**: samaanai-stg-1009-124126
**Project Number**: 362270100637
**Owner**: kittureddy2000@gmail.com

---

## 🌐 Service URLs

### Public Endpoints

| Service | URL | Status |
|---------|-----|--------|
| Backend API | https://samaanai-backend-staging-362270100637.us-west1.run.app | ✅ Running |
| Frontend | https://samaanai-frontend-staging-362270100637.us-west1.run.app | ✅ Running |
| n8n Workflows | https://n8n-workflow-automation-362270100637.us-west1.run.app | ✅ Running |

### API Endpoints

**Backend Base URL**: https://samaanai-backend-staging-362270100637.us-west1.run.app

Common endpoints:
- `/api/v1/auth/*` - Authentication
- `/api/v1/users/*` - User management
- `/api/v1/todo/*` - Todo/tasks
- `/api/v1/nutrition/*` - Nutrition tracking
- `/api/v1/integrations/*` - Microsoft To Do integration

---

## 💾 Database Information

### Database Schemas

#### samaanai_staging
Main application database containing:
- User accounts and authentication
- Todo/task management
- Nutrition tracking data
- Microsoft To Do integrations
- Notification preferences

**Schema managed by**: Prisma ORM
**Migration Location**: `/backend-express/prisma/migrations`

#### n8n_db
n8n workflow database containing:
- Workflow definitions
- Execution history
- Credentials (encrypted)
- Webhook configurations
- Settings

**Schema managed by**: n8n migrations (automatic)

---

## 🔌 Networking

### VPC Configuration

**Network Name**: n8n-network
**Subnet**: n8n-subnet (10.10.0.0/24)
**VPC Connector**: n8n-vpc-connector (10.11.0.0/28)

### Private IP Addresses

| Resource | Private IP | Purpose |
|----------|------------|---------|
| Cloud SQL | 10.201.0.3 | Database server |
| VPC Connector Range | 10.11.0.0/28 | Cloud Run to VPC bridge |

### Firewall Rules

- Default VPC rules apply
- Cloud SQL accessible only via VPC (no public IP)
- Cloud Run services have public HTTPS endpoints
- All database traffic stays within private network

### DNS & Domain Mapping

Currently using default Cloud Run URLs. Custom domains can be mapped:

```bash
# Example for custom domain mapping
gcloud run domain-mappings create \
  --service=samaanai-backend-staging \
  --domain=api-staging.yourdomain.com \
  --region=us-west1
```

---

## 💰 Cost Summary

### Monthly Cost Breakdown (Estimated)

| Component | Cost Range |
|-----------|------------|
| Cloud SQL (db-f1-micro) | $7-10 |
| VPC Connector | $7-10 |
| Backend Cloud Run | $10-15 |
| Frontend Cloud Run | $5-10 |
| n8n Cloud Run | $15-20 |
| Networking/Egress | $2-5 |
| **Total Monthly** | **$46-70** |

### Cost Optimization Features

✅ db-f1-micro tier (smallest instance)
✅ No automated backups
✅ Backend scales to zero when idle
✅ Single Cloud SQL instance for all databases
✅ f1-micro VPC connector
✅ All services in same region (no cross-region costs)

### Cost Monitoring

**Budget Alerts**: Set up in GCP Console
**Expected Range**: $35-50/month
**Recommendation**: Monitor first month to establish baseline

---

## 📊 Monitoring & Maintenance

### View Service Logs

#### Backend Logs
```bash
gcloud run services logs read samaanai-backend-staging \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126 \
  --limit=50
```

#### Frontend Logs
```bash
gcloud run services logs read samaanai-frontend-staging \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126 \
  --limit=50
```

#### n8n Logs
```bash
gcloud run services logs read n8n-workflow-automation \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126 \
  --limit=50
```

### Database Monitoring

#### Check Cloud SQL Status
```bash
gcloud sql instances describe n8n-postgres-instance \
  --project=samaanai-stg-1009-124126
```

#### Monitor Connections
```bash
# Connect to database and check connections
SELECT count(*) FROM pg_stat_activity;
```

### Manual Database Backup

```bash
# Export entire instance
gcloud sql export sql n8n-postgres-instance \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/manual-backup-$(date +%Y%m%d).sql \
  --database=samaanai_staging \
  --project=samaanai-stg-1009-124126

# Export n8n database
gcloud sql export sql n8n-postgres-instance \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/n8n-backup-$(date +%Y%m%d).sql \
  --database=n8n_db \
  --project=samaanai-stg-1009-124126
```

### Restore from Backup

```bash
# Import backup
gcloud sql import sql n8n-postgres-instance \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/BACKUP_FILE.sql \
  --database=samaanai_staging \
  --project=samaanai-stg-1009-124126
```

### Service Health Checks

```bash
# Check all services status
gcloud run services list \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126

# Quick health test
curl -I https://samaanai-backend-staging-362270100637.us-west1.run.app
curl -I https://samaanai-frontend-staging-362270100637.us-west1.run.app
curl -I https://n8n-workflow-automation-362270100637.us-west1.run.app
```

---

## 🔄 Deployment & Updates

### Backend Deployment

Automated via GitHub Actions on push to `staging` branch.

**Manual deployment**:
```bash
cd backend-express
gcloud run deploy samaanai-backend-staging \
  --source . \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126
```

### Frontend Deployment

Automated via GitHub Actions on push to `staging` branch.

### n8n Updates

```bash
# Pull latest n8n image
docker pull n8nio/n8n:latest

# Tag and push to Artifact Registry
docker tag n8nio/n8n:latest \
  us-west1-docker.pkg.dev/samaanai-stg-1009-124126/n8n-repo/n8n:latest

docker push us-west1-docker.pkg.dev/samaanai-stg-1009-124126/n8n-repo/n8n:latest

# Redeploy service
gcloud run deploy n8n-workflow-automation \
  --image=us-west1-docker.pkg.dev/samaanai-stg-1009-124126/n8n-repo/n8n:latest \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126
```

---

## 🛠️ Common Operations

### Scale Services

```bash
# Update backend min/max instances
gcloud run services update samaanai-backend-staging \
  --min-instances=1 \
  --max-instances=20 \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126
```

### Update Environment Variables

```bash
# Update backend environment variable
gcloud run services update samaanai-backend-staging \
  --update-env-vars="NEW_VAR=value" \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126
```

### Manage Secrets

```bash
# List secrets
gcloud secrets list --project=samaanai-stg-1009-124126

# Update secret
echo -n "new-secret-value" | gcloud secrets versions add SECRET_NAME \
  --data-file=- \
  --project=samaanai-stg-1009-124126
```

---

## ⚠️ Important Notes

### Security Considerations

1. **Database Access**: Only accessible via private VPC, no public IP
2. **Secrets**: All sensitive data stored in Secret Manager
3. **n8n Encryption Key**: Backup the encryption key securely - cannot be recovered if lost
4. **SSL/TLS**: All Cloud Run services use HTTPS by default

### Backup Strategy

- **Automated Backups**: Disabled (cost optimization)
- **Recommendation**: Create manual backups before:
  - Major application updates
  - Database schema changes
  - Production deployments

### Scaling Limitations

- **db-f1-micro**: Shared CPU, max 50 connections
  - Suitable for staging/development
  - Consider upgrading if performance issues occur
- **VPC Connector**: f1-micro, 200-300 Mbps throughput
  - Sufficient for staging workloads

### Migration History

- **Date**: November 8, 2025
- **Previous Location**: us-central1 with separate Cloud SQL instance
- **Migration Reason**: Cost optimization and infrastructure unification
- **Backup Created**: `samaanai_staging_backup_20251108_083639.sql`

---

## 📞 Support & Contact

**Project Owner**: kittureddy2000@gmail.com
**Environment**: Staging
**Purpose**: Development and testing

For issues or questions:
1. Check service logs in Cloud Run
2. Verify database connectivity
3. Review recent deployments
4. Check GitHub Actions for build failures

---

**Document Version**: 1.0
**Last Updated**: November 8, 2025
**Next Review**: December 8, 2025
