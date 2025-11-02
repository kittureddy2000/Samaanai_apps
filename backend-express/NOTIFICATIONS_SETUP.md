# Email & Push Notifications Setup Guide

## Overview

This app supports email notifications and push notifications through:
- **Email**: Nodemailer (works with Gmail, SendGrid, AWS SES, Mailgun, Resend)
- **Push**: Expo Push Notifications

## Recommended Approach: Use SendGrid Everywhere

**Why SendGrid for all environments?**
- ✅ Consistent behavior everywhere
- ✅ No Gmail app password hassles
- ✅ Better deliverability testing
- ✅ Same API key works for local, staging, and production
- ✅ Free tier (100 emails/day) is enough for development

### One-Time SendGrid Setup

1. Sign up at https://signup.sendgrid.com/
2. Verify your email
3. Complete sender authentication (Settings → Sender Authentication)
4. Create API Key (Settings → API Keys → Create API Key)
5. Copy the key (starts with `SG.`)

### Use Everywhere

**Local Development (.env)**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-api-key
APP_NAME=Samaanai
```

**Staging (Google Cloud Secrets)**
```bash
./setup-notification-secrets.sh staging
# Use the SAME SendGrid key
```

**Production (Google Cloud Secrets)**
```bash
./setup-notification-secrets.sh production
# Use the SAME SendGrid key (or create separate key)
```

**Push Notifications - Get Expo Token**

1. Go to https://expo.dev/accounts/[your-account]/settings/access-tokens
2. Create a new token
3. Add to `.env`:

```bash
EXPO_ACCESS_TOKEN=your-expo-token
```

### 2. Staging & Production

**Recommended: Use SendGrid (Free tier: 100 emails/day)**

#### Step 1: Sign up for SendGrid
1. Go to https://signup.sendgrid.com/
2. Create free account
3. Verify your email
4. Complete sender authentication (verify domain or single sender)

#### Step 2: Create API Key
1. Go to Settings → API Keys
2. Create API Key with "Full Access"
3. Copy the key (starts with `SG.`)

#### Step 3: Add to Google Cloud Secrets

For **Staging** environment:
```bash
# Set project
gcloud config set project samaanai-stg-1009-124126

# Create or update secrets
echo "smtp.sendgrid.net" | gcloud secrets create SMTP_HOST --data-file=- || \
  gcloud secrets versions add SMTP_HOST --data-file=-

echo "587" | gcloud secrets create SMTP_PORT --data-file=- || \
  gcloud secrets versions add SMTP_PORT --data-file=-

echo "false" | gcloud secrets create SMTP_SECURE --data-file=- || \
  gcloud secrets versions add SMTP_SECURE --data-file=-

echo "apikey" | gcloud secrets create SMTP_USER --data-file=- || \
  gcloud secrets versions add SMTP_USER --data-file=-

echo "SG.your-api-key-here" | gcloud secrets create SMTP_PASS --data-file=- || \
  gcloud secrets versions add SMTP_PASS --data-file=-

echo "Samaanai" | gcloud secrets create APP_NAME --data-file=- || \
  gcloud secrets versions add APP_NAME --data-file=-
```

For **Production** environment:
```bash
# Set project
gcloud config set project samaanai-prod-1009-124126

# Same commands as staging, but use production SendGrid account
```

#### Step 4: Grant Cloud Run access to secrets

Make sure your Cloud Run service has access:
```bash
# Staging
gcloud run services update samaanai-backend \
  --update-secrets=SMTP_HOST=SMTP_HOST:latest,SMTP_PORT=SMTP_PORT:latest,SMTP_SECURE=SMTP_SECURE:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest,APP_NAME=APP_NAME:latest \
  --region=us-central1 \
  --project=samaanai-stg-1009-124126

# Production
gcloud run services update samaanai-backend \
  --update-secrets=SMTP_HOST=SMTP_HOST:latest,SMTP_PORT=SMTP_PORT:latest,SMTP_SECURE=SMTP_SECURE:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest,APP_NAME=APP_NAME:latest \
  --region=us-central1 \
  --project=samaanai-prod-1009-124126
```

## Email Provider Comparison

| Provider | Free Tier | Best For | Difficulty |
|----------|-----------|----------|------------|
| **Gmail** | 100/day | Local dev only | Easy |
| **SendGrid** | 100/day forever | Production (recommended) | Easy |
| **Resend** | 3,000/month | Modern apps | Easy |
| **AWS SES** | 62,000/month (first year) | High volume | Medium |
| **Mailgun** | 5,000/month (3 months) | API-first apps | Easy |
| **Postmark** | 100/month | Transactional only | Easy |

## Configuration by Provider

### SendGrid (Recommended)
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey  # Literally "apikey"
SMTP_PASS=SG.your-sendgrid-api-key
```

### Resend (Modern Alternative)
```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=re_your-resend-api-key
```

### AWS SES (High Volume)
```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
```

## Expo Push Notifications Setup

### Get Access Token
1. Login to https://expo.dev
2. Go to Account Settings → Access Tokens
3. Create token with appropriate permissions
4. Add to environment:

```bash
EXPO_ACCESS_TOKEN=your-expo-access-token
```

### Mobile App Setup (Already Done)
The mobile app needs to register push tokens with the backend:
- Uses `expo-notifications` library
- Calls `POST /api/v1/user/push-token` with token
- Token stored in user profile

## Testing

### Test Email Service
```bash
# In your backend, you can test by creating a test route
curl -X POST http://localhost:8080/api/v1/user/test-email \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Push Notifications
1. Register push token from mobile app
2. Use Expo's push notification tool: https://expo.dev/notifications
3. Or send from backend using the notification service

## Scheduled Jobs

The following jobs run automatically:
- **Weekly Reports**: Every Monday at 8:00 AM PST
- **Morning Task Reminders**: Daily at 9:00 AM PST
- **Evening Task Reminders**: Daily at 6:00 PM PST

Jobs respect user preferences:
- `notifications` - Push notifications on/off
- `emailNotifications` - Email notifications on/off
- `weeklyReports` - Weekly reports on/off

## Troubleshooting

### Email not sending
1. Check SMTP credentials are correct
2. Verify SMTP_HOST and SMTP_PORT match your provider
3. Check logs for transporter verification errors
4. For Gmail: Ensure App Password is used, not regular password
5. For SendGrid: Verify sender authentication is complete

### Push notifications not working
1. Verify EXPO_ACCESS_TOKEN is valid
2. Check push token is registered: `GET /api/v1/user/preferences`
3. Ensure mobile app has notification permissions
4. Test with Expo's push notification tool first

### Weekly reports not sending
1. Check server logs for cron job execution
2. Verify user has `weeklyReports: true` in preferences
3. Ensure user has valid email and/or push token
4. Test manually: Use `sendWeeklyReportForUser(userId)` function

## Security Best Practices

1. **Never commit** `.env` file with real credentials
2. **Use Secret Manager** for staging/production (Google Cloud Secrets)
3. **Rotate credentials** periodically
4. **Use different accounts** for staging and production
5. **Monitor usage** to detect anomalies
6. **Set up alerts** for email bounces/failures

## Cost Estimates

Based on 1,000 active users:

| Service | Monthly Emails | Cost |
|---------|---------------|------|
| SendGrid (Free) | ~4,000 | $0 |
| SendGrid (Paid) | ~50,000 | $15 |
| AWS SES | ~50,000 | $5 |
| Resend | ~50,000 | $20 |

Push notifications via Expo are free.

## Recommended Setup (Simplest)

- **All Environments**: SendGrid (same account, same API key)
- **Push**: Expo (free)

This gives you:
- One account to manage
- Consistent behavior
- 100 emails/day free (enough for dev + staging + small production)
- Easy to upgrade if needed

## Support

- SendGrid Docs: https://docs.sendgrid.com/
- Expo Push Docs: https://docs.expo.dev/push-notifications/overview/
- Nodemailer Docs: https://nodemailer.com/
