# Quick Start: Email & Push Notifications

**Simple setup using SendGrid for everything.**

## 5-Minute Setup

### Step 1: Sign up for SendGrid (Free)
1. Go to https://signup.sendgrid.com/
2. Verify your email
3. Complete sender authentication
4. Create API Key → Copy it (starts with `SG.`)

### Step 2: Set up Local Development
```bash
cd backend-express
cp .env.example .env
```

Edit `.env` and add:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.paste-your-api-key-here
APP_NAME=Samaanai
```

### Step 3: Test Locally
```bash
npm run dev
# Backend will start and connect to SendGrid
```

### Step 4: Set up Staging
```bash
./setup-notification-secrets.sh staging
# Choose SendGrid and paste the SAME API key
```

### Step 5: Set up Production
```bash
./setup-notification-secrets.sh production
# Use the SAME API key (or create a separate one)
```

### Step 6: Deploy
```bash
# Deploy staging
gh workflow run deploy-staging.yml

# Deploy production
gh workflow run deploy-production.yml
```

## That's It!

You now have:
- ✅ Welcome emails on user registration
- ✅ Weekly report emails (Mondays at 8 AM)
- ✅ Task reminder emails (9 AM & 6 PM daily)
- ✅ User preferences for notifications
- ✅ Same setup across all environments

## Push Notifications (Optional)

If you want push notifications:
1. Get Expo token: https://expo.dev/accounts/[account]/settings/access-tokens
2. Add to `.env`: `EXPO_ACCESS_TOKEN=your-token`
3. Add same token to staging/production using the setup script

## Monitoring

Check if emails are sending:
```bash
# Check SendGrid dashboard
https://app.sendgrid.com/

# Check server logs
gcloud run services logs read samaanai-backend \
  --region=us-central1 \
  --project=samaanai-stg-1009-124126
```

## Cost

- **SendGrid Free**: 100 emails/day = ~3,000/month = **$0**
- **Expo Push**: Unlimited = **$0**

Total: **$0/month** until you exceed 100 emails/day

## Need More Volume?

When you exceed 100 emails/day:
- SendGrid $15/month = 50,000 emails
- AWS SES $0.10/1000 emails (cheaper for high volume)

For more details, see `NOTIFICATIONS_SETUP.md`
