# Samaanai Infrastructure - Quick Reference

**Last Updated**: November 8, 2025

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| `STAGING_INFRASTRUCTURE_DOCUMENTATION.md` | Complete staging environment documentation |
| `PRODUCTION_INFRASTRUCTURE_DOCUMENTATION.md` | Complete production environment documentation |
| `LOCAL_DEVELOPMENT.md` | Local development setup guide |
| `README.md` | Project overview |

---

## 🔐 Quick Access Credentials

### Staging

**n8n Admin**:
- URL: https://n8n-workflow-automation-362270100637.us-west1.run.app
- Email: kittureddy2000@gmail.com
- Password: Vtnkpv55!@#

**Database (samaanai_staging)**:
- User: postgres
- Password: ajdIuZuLj9bNsg5Nnm9VkS3BkoHUrYEi

**Database (n8n_db)**:
- User: n8n_user
- Password: L2tZD8Fwc0m0c6eMv2i6qfzUh

### Production

**n8n Admin**:
- URL: https://n8n-workflow-automation-172298808029.us-west1.run.app
- Email: kittureddy2000@gmail.com
- Password: FAP9p857f2Bq55W

**Database (samaanai)**:
- User: postgres
- Password: mxtVS6vhDhAgVyeKKqIAIeVPiBCT5lyx

**Database (n8n_db)**:
- User: n8n_user
- Password: P9mKx3wLt5nRq8vYzFjCh2bN7

---

## 🌐 Service URLs

### Staging (samaanai-stg-1009-124126)

| Service | URL |
|---------|-----|
| Backend | https://samaanai-backend-staging-362270100637.us-west1.run.app |
| Frontend | https://samaanai-frontend-staging-362270100637.us-west1.run.app |
| n8n | https://n8n-workflow-automation-362270100637.us-west1.run.app |

### Production (samaanai-prod-1009-124126)

| Service | URL |
|---------|-----|
| Backend | https://samaanai-backend-172298808029.us-west1.run.app |
| Frontend | https://samaanai-frontend-172298808029.us-west1.run.app |
| n8n | https://n8n-workflow-automation-172298808029.us-west1.run.app |

---

## 🗄️ Cloud SQL Instances

### Staging
- **Instance**: n8n-postgres-instance
- **Connection**: samaanai-stg-1009-124126:us-west1:n8n-postgres-instance
- **Private IP**: 10.201.0.3
- **Databases**: n8n_db, samaanai_staging, postgres

### Production
- **Instance**: samaanai-prod-postgres
- **Connection**: samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres
- **Private IP**: 10.119.0.3
- **Databases**: n8n_db, samaanai, postgres

---

## 💰 Monthly Costs

| Environment | Estimated Cost |
|-------------|----------------|
| Staging | $46-70/month |
| Production | $57-87/month |
| **Total** | **$103-157/month** |

---

## 🔧 Common Commands

### View Service Status
```bash
# Staging
gcloud run services list --region=us-west1 --project=samaanai-stg-1009-124126

# Production
gcloud run services list --region=us-west1 --project=samaanai-prod-1009-124126
```

### View Logs
```bash
# Staging backend
gcloud run services logs read samaanai-backend-staging --region=us-west1 --project=samaanai-stg-1009-124126 --limit=50

# Production backend
gcloud run services logs read samaanai-backend --region=us-west1 --project=samaanai-prod-1009-124126 --limit=50
```

### Connect to Database
```bash
# Staging
cloud-sql-proxy samaanai-stg-1009-124126:us-west1:n8n-postgres-instance --port 5433
PGPASSWORD=ajdIuZuLj9bNsg5Nnm9VkS3BkoHUrYEi psql -h localhost -p 5433 -U postgres -d samaanai_staging

# Production
cloud-sql-proxy samaanai-prod-1009-124126:us-west1:samaanai-prod-postgres --port 5432
PGPASSWORD=mxtVS6vhDhAgVyeKKqIAIeVPiBCT5lyx psql -h localhost -p 5432 -U postgres -d samaanai
```

### Create Database Backup
```bash
# Staging
gcloud sql export sql n8n-postgres-instance \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/staging-$(date +%Y%m%d).sql \
  --database=samaanai_staging \
  --project=samaanai-stg-1009-124126

# Production
gcloud sql export sql samaanai-prod-postgres \
  gs://samaanai-stg-1009-124126_cloudbuild/backups/prod-$(date +%Y%m%d).sql \
  --database=samaanai \
  --project=samaanai-prod-1009-124126
```

---

## ⚠️ Important Security Notes

### n8n Encryption Keys

**CRITICAL**: Store these securely - cannot be recovered if lost!

- **Staging**: `16w6I2rRS3xQ/HiwOA0rXzYnn9umpaIQINFfII4amM4=`
- **Production**: `DrlIyyQ/qtrgnXlra5LKkJ0xIfSubkr3Av3P0+OukAA=`

### Backup Strategy

- **Automated Backups**: Disabled (both environments)
- **Recommendation**: Create manual backups before major changes
- **Storage**: gs://samaanai-stg-1009-124126_cloudbuild/backups/

### Access Control

- **Project Owner**: kittureddy2000@gmail.com
- **Recommendation**: Enable 2FA on Google account
- **Database Access**: Private VPC only (no public IPs)

---

## 📞 Quick Troubleshooting

### Service Not Responding
```bash
# Check service status
gcloud run services describe SERVICE_NAME --region=us-west1 --project=PROJECT_ID

# View recent logs
gcloud run services logs read SERVICE_NAME --region=us-west1 --project=PROJECT_ID --limit=100
```

### Database Connection Issues
```bash
# Check Cloud SQL status
gcloud sql instances describe INSTANCE_NAME --project=PROJECT_ID

# Verify VPC connector
gcloud compute networks vpc-access connectors list --region=us-west1 --project=PROJECT_ID
```

### High Costs
```bash
# View billing
gcloud billing projects describe PROJECT_ID

# Check resource usage
gcloud logging read "resource.type=cloud_run_revision" --limit=100 --project=PROJECT_ID
```

---

## 🚀 Deployment

### Staging
- **Branch**: Push to `staging` branch
- **Automated**: Via GitHub Actions

### Production
- **Branch**: Push to `main` branch
- **Automated**: Via GitHub Actions

---

## 📋 Checklist for Major Changes

Before deploying major changes:

- [ ] Create database backup
- [ ] Test in staging environment
- [ ] Review recent logs for errors
- [ ] Verify all tests pass
- [ ] Check Cloud Run instance health
- [ ] Monitor costs after deployment
- [ ] Verify database migrations succeeded

---

For detailed information, refer to:
- **Staging**: `STAGING_INFRASTRUCTURE_DOCUMENTATION.md`
- **Production**: `PRODUCTION_INFRASTRUCTURE_DOCUMENTATION.md`
