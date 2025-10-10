# 🔐 Complete Google OAuth Setup Guide

## Overview

This guide will help you set up Google OAuth for both **staging** and **production** environments. Each environment has its own:
- Google OAuth Client ID and Secret
- Backend API URL
- Frontend Web URL
- Redirect URLs

---

## 🎯 Environment Configuration

### Staging Environment
- **Frontend:** https://samaanai-frontend-staging-hdp6ioqupa-uc.a.run.app
- **Backend:** https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app
- **OAuth Callback:** https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/auth/google/callback

### Production Environment
- **Frontend:** https://samaanai-frontend.run.app (will be set when you deploy to main branch)
- **Backend:** https://samaanai-backend.run.app (will be set when you deploy to main branch)
- **OAuth Callback:** https://samaanai-backend.run.app/api/v1/auth/google/callback

---

## 📋 Step-by-Step Setup

### Step 1: Go to Google Cloud Console

Visit: **https://console.cloud.google.com/apis/credentials**

### Step 2: Create OAuth Consent Screen (if not already done)

1. Click **"OAuth consent screen"** in the left menu
2. Choose **"External"** user type
3. Fill in the application details:
   - **App name:** Samaanai
   - **User support email:** Your email
   - **Developer contact:** Your email
4. Add scopes (at minimum):
   - `email`
   - `profile`
   - `openid`
5. Click **"Save and Continue"**

### Step 3: Create Staging OAuth Credentials

1. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
2. **Application type:** Web application
3. **Name:** Samaanai Staging
4. **Authorized JavaScript origins:**
   ```
   https://samaanai-frontend-staging-hdp6ioqupa-uc.a.run.app
   https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app
   ```
5. **Authorized redirect URIs:**
   ```
   https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/auth/google/callback
   ```
6. Click **"Create"**
7. **Copy the Client ID and Client Secret** - you'll need these!

### Step 4: Create Production OAuth Credentials

1. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
2. **Application type:** Web application
3. **Name:** Samaanai Production
4. **Authorized JavaScript origins:**
   ```
   https://samaanai-frontend.run.app
   https://samaanai-backend.run.app
   ```
5. **Authorized redirect URIs:**
   ```
   https://samaanai-backend.run.app/api/v1/auth/google/callback
   ```
6. Click **"Create"**
7. **Copy the Client ID and Client Secret**

### Step 5: Update GCP Secrets

Run the update script:

```bash
./update-google-oauth.sh
```

Enter the credentials when prompted:
- Staging Client ID (from Step 3)
- Staging Client Secret (from Step 3)
- Production Client ID (from Step 4)
- Production Client Secret (from Step 4)

### Step 6: Redeploy Backend

The backend needs to be redeployed to pick up the new credentials:

```bash
# Trigger staging deployment
git commit --allow-empty -m "redeploy: update Google OAuth credentials"
git push origin staging

# Wait for deployment to complete
gh run watch $(gh run list --branch staging --limit 1 --json databaseId --jq '.[0].databaseId')
```

---

## ✅ Verification

### Test Staging

1. Open: https://samaanai-frontend-staging-hdp6ioqupa-uc.a.run.app
2. Click **"Login with Google"**
3. You should be redirected to Google login
4. After login, you should be redirected back to the staging frontend with your user data

### Test Production (after deploying to main branch)

1. Open: https://samaanai-frontend.run.app
2. Click **"Login with Google"**
3. Verify the flow works end-to-end

---

## 🔍 How It Works

### Dynamic Environment Routing

The application uses environment-based secrets to route correctly:

```
┌─────────────────────────────────────────────────────────┐
│                   User clicks "Login"                    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend redirects to Backend OAuth endpoint            │
│  staging: backend-staging/auth/google                    │
│  prod: backend/auth/google                               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Backend uses GOOGLE_CALLBACK_URL secret                 │
│  staging: backend-staging/auth/google/callback           │
│  prod: backend/auth/google/callback                      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Google authenticates and redirects to callback URL      │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Backend processes auth and redirects to frontend        │
│  Uses GOOGLE_SUCCESS_REDIRECT secret                     │
│  staging: frontend-staging with tokens                   │
│  prod: frontend with tokens                              │
└─────────────────────────────────────────────────────────┘
```

### Secrets Configuration

Each environment has these secrets in GCP Secret Manager:

**Staging (samaanai-stg-1009-124126):**
- `GOOGLE_CLIENT_ID` - OAuth Client ID for staging
- `GOOGLE_CLIENT_SECRET` - OAuth Client Secret for staging
- `GOOGLE_CALLBACK_URL` - Backend callback URL for staging
- `GOOGLE_SUCCESS_REDIRECT` - Frontend URL for staging

**Production (samaanai-prod-1009-124126):**
- `GOOGLE_CLIENT_ID` - OAuth Client ID for production
- `GOOGLE_CLIENT_SECRET` - OAuth Client Secret for production
- `GOOGLE_CALLBACK_URL` - Backend callback URL for production
- `GOOGLE_SUCCESS_REDIRECT` - Frontend URL for production

---

## 🐛 Troubleshooting

### Issue: "redirect_uri_mismatch" error

**Cause:** The redirect URI in the OAuth request doesn't match what's registered in Google Cloud Console.

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Verify the exact redirect URI is listed:
   - Staging: `https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/auth/google/callback`
   - Production: `https://samaanai-backend.run.app/api/v1/auth/google/callback`

### Issue: Still redirecting to localhost

**Cause:** Backend hasn't picked up the new secrets yet.

**Solution:**
1. Check secrets are set correctly:
   ```bash
   gcloud secrets versions access latest --secret="GOOGLE_SUCCESS_REDIRECT" --project=samaanai-stg-1009-124126
   ```
2. Redeploy backend:
   ```bash
   git commit --allow-empty -m "redeploy backend"
   git push origin staging
   ```

### Issue: "Access blocked: This app's request is invalid"

**Cause:** OAuth consent screen is not properly configured.

**Solution:**
1. Go to OAuth consent screen in Google Cloud Console
2. Ensure all required fields are filled
3. Add test users if app is in "Testing" mode
4. Or publish the app for production use

---

## 📝 Summary

After completing this setup:

✅ Staging and Production have separate OAuth credentials
✅ Each environment redirects to its own frontend URL
✅ OAuth flow works end-to-end in both environments
✅ Secrets are managed securely in GCP Secret Manager
✅ Automatic deployment updates the configuration

---

## 🆘 Need Help?

If you encounter any issues:

1. Check the backend logs:
   ```bash
   gcloud run logs read samaanai-backend-staging --project=samaanai-stg-1009-124126 --limit=50
   ```

2. Verify secrets are set:
   ```bash
   gcloud secrets list --project=samaanai-stg-1009-124126
   ```

3. Check GitHub Actions deployment logs:
   ```bash
   gh run view --log-failed
   ```
