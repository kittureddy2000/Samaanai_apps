# 🚀 TODO: Complete Notification Setup

## ✅ What's Already Done
- ✅ Email service created
- ✅ Push notification service created
- ✅ Scheduler service created (weekly reports, task reminders)
- ✅ Database migration completed (push token field added)
- ✅ API endpoints created
- ✅ `.env` file created with placeholders

## 📝 What YOU Need to Do

### Step 1: Get SendGrid API Key (5 minutes)

1. Go to https://signup.sendgrid.com/ and create account
2. Verify your email
3. Complete "Sender Authentication":
   - Go to Settings → Sender Authentication
   - Choose "Single Sender Verification" (easiest)
   - Verify your email address
4. Create API Key:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name: `Samaanai-All-Environments`
   - Choose "Full Access"
   - Click "Create & View"
   - **COPY THE KEY** (starts with `SG.`)

### Step 2: Update .env File

Open `backend-express/.env` and replace this line:

```bash
SMTP_PASS=SG.PASTE-YOUR-SENDGRID-API-KEY-HERE
```

With your actual SendGrid key:

```bash
SMTP_PASS=SG.your-actual-key-here
```

### Step 3: Test Locally (Optional but Recommended)

```bash
cd backend-express
npm run dev
# Server should start without email errors
```

### Step 4: Deploy to Staging

```bash
cd backend-express

# Run the setup script
./setup-notification-secrets.sh staging

# When prompted:
# - Choose option 1 (SendGrid)
# - Paste the SAME SendGrid API key
# - Press Enter to skip Expo token (optional for now)
```

### Step 5: Deploy to Production

```bash
cd backend-express

# Run the setup script
./setup-notification-secrets.sh production

# When prompted:
# - Choose option 1 (SendGrid)
# - Paste the SAME SendGrid API key
# - Press Enter to skip Expo token (optional for now)
```

### Step 6: Deploy Both Environments

```bash
# Deploy staging
gh workflow run deploy-staging.yml

# Deploy production
gh workflow run deploy-production.yml
```

## 🎯 What Will Work After Setup

Once you complete the steps above:

✅ **Welcome Emails**: New users get welcome email automatically
✅ **Weekly Reports**: Every Monday at 8:00 AM PST
✅ **Task Reminders**: Daily at 9:00 AM and 6:00 PM PST
✅ **User Preferences**: Users can toggle notifications on/off in app

## 🔍 How to Verify It's Working

### Check Email Service
```bash
# Check SendGrid dashboard
https://app.sendgrid.com/

# You should see email activity when users register
```

### Check Server Logs
```bash
# Staging logs
gcloud run services logs read samaanai-backend \
  --region=us-central1 \
  --project=samaanai-stg-1009-124126 \
  --limit=50

# Production logs
gcloud run services logs read samaanai-backend \
  --region=us-central1 \
  --project=samaanai-prod-1009-124126 \
  --limit=50
```

Look for messages like:
- "Email service is ready to send messages"
- "Email sent: <message-id>"
- "Scheduler service initialized successfully"

## 💰 Cost

- SendGrid Free: 100 emails/day = **$0/month**
- Will cover development + staging + small production
- Upgrade to $15/month when you exceed 100 emails/day

## 🐛 Troubleshooting

### Email not sending locally?
1. Check `.env` file has correct `SMTP_PASS`
2. Verify SendGrid API key is valid
3. Check server logs for errors
4. Verify sender authentication is complete in SendGrid

### Email not sending in staging/production?
1. Check Google Cloud Secrets are set correctly
2. Verify Cloud Run service has access to secrets
3. Check logs with command above
4. Verify environment variables in Cloud Run console

## 📚 Additional Resources

- Full documentation: `NOTIFICATIONS_SETUP.md`
- Quick start guide: `QUICKSTART_NOTIFICATIONS.md`
- SendGrid docs: https://docs.sendgrid.com/

## ✏️ Push Notifications (Optional - Do Later)

If you want push notifications:

1. Get Expo token: https://expo.dev/settings/access-tokens
2. Add to `.env`: `EXPO_ACCESS_TOKEN=your-token`
3. Run setup scripts again for staging/production
4. Mobile app will automatically register push tokens

---

**Need help? Check the documentation files or SendGrid support!**
