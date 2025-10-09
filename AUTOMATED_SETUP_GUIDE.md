# 🤖 Automated Setup Guide

This guide will help you run the automated setup script that configures both staging and production environments with minimal manual work.

## 🎯 What the Script Does

The `setup-gcp-environments.sh` script automates **~80% of the setup work**:

### ✅ Automated by Script
- Creates staging and production GCP projects
- Enables all required APIs (Cloud Run, Secret Manager, etc.)
- Creates service accounts with proper IAM roles
- Generates and downloads service account keys
- Creates all secrets in Google Secret Manager
- Generates strong JWT secrets automatically
- Creates summary files with all the information you need

### ⚙️ Manual Steps (You Do These)
- Run the script (answers questions interactively)
- Add 4 GitHub Secrets (script tells you exactly what to paste)
- Create GitHub repository
- Push to deploy

---

## 📋 Prerequisites

Before running the script, ensure you have:

1. **gcloud CLI installed**
   ```bash
   # Check if installed
   gcloud version

   # If not installed, get it from:
   # https://cloud.google.com/sdk/docs/install
   ```

2. **Logged in to gcloud**
   ```bash
   gcloud auth login
   ```

3. **Billing account set up** (for GCP projects)
   - You need a billing account to create projects
   - Set up at: https://console.cloud.google.com/billing

4. **Database URLs ready** (optional - can provide later)
   - Staging database connection string
   - Production database connection string (must be different!)

---

## 🚀 Running the Setup Script

### Step 1: Make Sure You're in the Project Directory

```bash
cd /Users/krishnayadamakanti/Documents/Samaanai_apps
```

### Step 2: Run the Script

```bash
./setup-gcp-environments.sh
```

### Step 3: Answer the Questions

The script will ask you questions. Here's what to expect:

#### Question 1: Project IDs
```
Enter STAGING project ID [samaanai-staging]:
```
**Recommendation:** Press Enter to use default, or enter your own ID

```
Enter PRODUCTION project ID [samaanai-prod]:
```
**Recommendation:** Press Enter to use default, or enter your own ID

#### Question 2: Region
```
Enter GCP region [us-central1]:
```
**Recommendation:** Press Enter (us-central1 is good for most cases)

#### Question 3: Database Setup
```
Choose your database setup:
  1) Cloud SQL (managed PostgreSQL on GCP)
  2) External database (Neon, Supabase, etc.)

Select option (1 or 2) [2]:
```
**Recommendation:**
- Choose `1` if you want managed database on GCP (costs ~$10-20/mo)
- Choose `2` if using external database like Neon/Supabase (easier, often free)

#### Question 4: Database URLs (if using external)
```
Enter STAGING database URL:
```
**Example:** `postgresql://user:pass@staging-host.neon.tech/samaanai_staging?sslmode=require`

```
Enter PRODUCTION database URL (must be different from staging!):
```
**Example:** `postgresql://user:pass@prod-host.neon.tech/samaanai?sslmode=require`

#### Question 5: Google OAuth (optional)
```
Do you have Google OAuth credentials for staging? [y/N]:
```
**Recommendation:** Say `n` for now, you can add them later

The script will use placeholders and you can update secrets later.

---

## 📁 What the Script Creates

After running, you'll have:

```
gcp-setup-output/
├── github-actions-staging-key.json       ← Staging service account key
├── github-actions-prod-key.json          ← Production service account key
├── SETUP_SUMMARY.txt                     ← Complete summary of what was created
├── GITHUB_SECRETS_INSTRUCTIONS.txt       ← Step-by-step GitHub secrets guide
└── setup.log                             ← Full log of everything that happened
```

**⚠️ This directory is in `.gitignore` - it won't be committed to git**

---

## 📝 After the Script Completes

### Step 1: Review the Summary

```bash
cat gcp-setup-output/SETUP_SUMMARY.txt
```

This shows you everything that was created.

### Step 2: Add GitHub Secrets

The script created detailed instructions:

```bash
cat gcp-setup-output/GITHUB_SECRETS_INSTRUCTIONS.txt
```

Follow those instructions to add 4 secrets to GitHub:

1. Go to: `https://github.com/YOUR_USERNAME/Samaanai_apps/settings/secrets/actions`
2. Click "New repository secret"
3. Add these 4 secrets:

#### Secret 1: GCP_PROJECT_ID_STAGING
```
Name: GCP_PROJECT_ID_STAGING
Value: samaanai-staging  (or your staging project ID)
```

#### Secret 2: GCP_PROJECT_ID_PROD
```
Name: GCP_PROJECT_ID_PROD
Value: samaanai-prod  (or your production project ID)
```

#### Secret 3: GCP_SA_KEY_STAGING
```
Name: GCP_SA_KEY_STAGING
Value: (paste entire contents of github-actions-staging-key.json)
```

To get the value:
```bash
cat gcp-setup-output/github-actions-staging-key.json

# On macOS, copy to clipboard:
cat gcp-setup-output/github-actions-staging-key.json | pbcopy
```

#### Secret 4: GCP_SA_KEY_PROD
```
Name: GCP_SA_KEY_PROD
Value: (paste entire contents of github-actions-prod-key.json)
```

To get the value:
```bash
cat gcp-setup-output/github-actions-prod-key.json

# On macOS, copy to clipboard:
cat gcp-setup-output/github-actions-prod-key.json | pbcopy
```

### Step 3: Create Staging Branch

```bash
git checkout -b staging
git push -u origin staging
```

This will automatically deploy to staging!

### Step 4: Monitor Deployment

1. Go to GitHub: `https://github.com/YOUR_USERNAME/Samaanai_apps/actions`
2. Watch the workflow run
3. After 3-5 minutes, you'll see the service URL in the logs

### Step 5: Test Staging

```bash
# Get the URL from GitHub Actions output
# Then test:
curl https://samaanai-backend-staging-xxxxx.run.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-05T...",
  "uptime": 123.45,
  "environment": "staging"
}
```

### Step 6: Deploy to Production (After Testing Staging)

```bash
git checkout main
git merge staging
git push origin main
```

---

## 🔍 Troubleshooting

### Error: "gcloud: command not found"

**Solution:** Install gcloud CLI
```bash
# macOS (Homebrew)
brew install --cask google-cloud-sdk

# Or download from:
# https://cloud.google.com/sdk/docs/install
```

### Error: "You are not currently authenticated"

**Solution:** Log in to gcloud
```bash
gcloud auth login
```

### Error: "The caller does not have permission"

**Solution:**
1. Make sure you're logged in with the right account
2. Ensure your account has permissions to create projects
3. Check if you have a billing account set up

### Error: "Project already exists"

**Solution:** The script handles this! It will ask if you want to use the existing project.

### Script Stops or Fails

**Solution:**
1. Check the log file: `cat gcp-setup-output/setup.log`
2. The script is idempotent - you can run it again safely
3. It will skip already-created resources

---

## 🔄 Re-running the Script

The script is **safe to run multiple times**:

- ✅ Skips already-created projects
- ✅ Skips already-created service accounts
- ✅ Updates existing secrets (if you want)
- ✅ Asks before recreating service account keys

To re-run:
```bash
./setup-gcp-environments.sh
```

---

## 📊 Time Estimates

| Task | Manual (STAGING_PRODUCTION_SETUP.md) | Automated (Script) |
|------|--------------------------------------|-------------------|
| Create projects | 5 min | 1 min (automated) |
| Enable APIs | 10 min | 2 min (automated) |
| Create service accounts | 5 min | 1 min (automated) |
| Grant IAM roles | 10 min | 1 min (automated) |
| Create secrets | 15 min | 2 min (automated) |
| Download keys | 5 min | 1 min (automated) |
| **Total Setup Time** | **~50 minutes** | **~8 minutes** |
| Add GitHub Secrets | 5 min | 5 min (still manual) |
| **Grand Total** | **55 minutes** | **13 minutes** |

**Time Saved: ~75%** 🎉

---

## 🎓 What You've Learned

After running the script, you'll have:

1. ✅ Two GCP projects (staging & production)
2. ✅ All required APIs enabled
3. ✅ Service accounts with proper permissions
4. ✅ All secrets created in Secret Manager
5. ✅ Service account keys ready for GitHub
6. ✅ Complete documentation of what was created

---

## 🔐 Security Notes

### Service Account Keys

The script creates service account keys in `gcp-setup-output/`:
- **Protected:** This directory is in `.gitignore`
- **Sensitive:** Never commit these keys to git
- **Optional deletion:** After adding to GitHub Secrets, you can delete them

To delete keys after setup:
```bash
rm -rf gcp-setup-output/
```

### Secrets in Secret Manager

All application secrets are stored in Google Secret Manager:
- Database URLs
- JWT secrets
- Google OAuth credentials

These are **NOT** in the service account key files. They're safely stored in GCP.

---

## 📚 Next Steps

After automated setup completes:

1. ✅ Review `gcp-setup-output/SETUP_SUMMARY.txt`
2. ✅ Add 4 GitHub Secrets (see `GITHUB_SECRETS_INSTRUCTIONS.txt`)
3. ✅ Create staging branch: `git checkout -b staging && git push`
4. ✅ Test staging deployment
5. ✅ Deploy to production: `git push origin main`
6. 📖 Use `QUICK_REFERENCE.md` for daily operations

---

## 🆘 Getting Help

If you encounter issues:

1. **Check the log:** `cat gcp-setup-output/setup.log`
2. **Review the summary:** `cat gcp-setup-output/SETUP_SUMMARY.txt`
3. **Check documentation:** See `STAGING_PRODUCTION_SETUP.md` for manual steps
4. **Verify prerequisites:** Make sure gcloud CLI is installed and you're logged in

---

## 🎉 You're Almost There!

The automated script handles the heavy lifting. Just run it, answer a few questions, and you'll have both environments set up in minutes!

```bash
./setup-gcp-environments.sh
```

**Happy deploying! 🚀**

---

**Last Updated:** 2025-10-05
**Script Version:** 1.0.0
