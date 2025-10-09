# GitHub Actions Workflows

This directory contains automated CI/CD workflows for Samaanai.

## Workflows

### 🚀 backend-deploy.yml

**Purpose:** Automated deployment of backend to Google Cloud Run

**Triggers:**
- Push to `main` branch → Deploys to **Production**
- Push to `staging` branch → Deploys to **Staging**
- Manual workflow dispatch → Choose environment

**Environments:**

| Environment | Branch | GCP Project | Service Name | Resources |
|-------------|--------|-------------|--------------|-----------|
| **Staging** | `staging` | `samaanai-staging` | `samaanai-backend-staging` | 512MB, 0-10 instances |
| **Production** | `main` | `samaanai-prod` | `samaanai-backend` | 1GB, 1-100 instances |

**Workflow Steps:**

1. **Setup** - Determines target environment based on trigger
2. **Test** - Runs all tests (must pass to continue)
3. **Deploy:**
   - Build Docker image
   - Push to Google Container Registry
   - Deploy to Cloud Run
   - Run Prisma migrations
   - Perform health check

**Required GitHub Secrets:**

```
GCP_PROJECT_ID_STAGING    # Staging GCP project ID
GCP_PROJECT_ID_PROD       # Production GCP project ID
GCP_SA_KEY_STAGING        # Staging service account key (JSON)
GCP_SA_KEY_PROD           # Production service account key (JSON)
```

**Manual Trigger:**

1. Go to **Actions** tab
2. Select **Deploy Backend to Cloud Run**
3. Click **Run workflow**
4. Choose:
   - Branch: `main` or `staging`
   - Environment: `staging` or `production`
5. Click **Run workflow**

## Adding New Workflows

To add a new workflow:

1. Create a new `.yml` file in this directory
2. Define the workflow name, triggers, and jobs
3. Add required secrets to GitHub repository settings
4. Document the workflow in this README

## Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Workflow Syntax](https://docs.github.com/actions/reference/workflow-syntax-for-github-actions)
- [Google Cloud Run Deployment](https://cloud.google.com/run/docs)

## Support

For issues with workflows:
1. Check the Actions tab for detailed logs
2. Review the workflow YAML syntax
3. Verify all required secrets are configured
4. See main project documentation in repository root
