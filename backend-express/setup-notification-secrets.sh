#!/bin/bash

# Setup Email & Push Notification Secrets for Google Cloud
# Usage: ./setup-notification-secrets.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" = "staging" ]; then
    PROJECT_ID="samaanai-stg-1009-124126"
    SERVICE_NAME="samaanai-backend-staging"
elif [ "$ENVIRONMENT" = "production" ]; then
    PROJECT_ID="samaanai-prod-1009-124126"
    SERVICE_NAME="samaanai-backend"
else
    echo "Usage: ./setup-notification-secrets.sh [staging|production]"
    exit 1
fi

echo "🚀 Setting up notification secrets for $ENVIRONMENT environment"
echo "Project: $PROJECT_ID"
echo ""

# Set the project
gcloud config set project $PROJECT_ID

# Function to create or update secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2

    # Check if secret exists
    if gcloud secrets describe $SECRET_NAME &>/dev/null; then
        echo "Updating existing secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=-
    else
        echo "Creating new secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=-
    fi
}

echo "📧 Email Configuration"
echo "====================="
echo ""
echo "Choose your email provider:"
echo "1) SendGrid (Recommended for production)"
echo "2) Resend (Modern, developer-friendly)"
echo "3) AWS SES (Best for high volume)"
echo "4) Gmail (Local dev only)"
echo ""
read -p "Enter choice [1-4]: " EMAIL_PROVIDER

case $EMAIL_PROVIDER in
    1)
        echo ""
        echo "SendGrid Setup:"
        echo "1. Sign up at https://signup.sendgrid.com/"
        echo "2. Verify your email and complete sender authentication"
        echo "3. Create API Key at Settings → API Keys"
        echo ""
        read -p "Enter SendGrid API Key (starts with SG.): " SENDGRID_KEY

        create_or_update_secret "SMTP_HOST" "smtp.sendgrid.net"
        create_or_update_secret "SMTP_PORT" "587"
        create_or_update_secret "SMTP_SECURE" "false"
        create_or_update_secret "SMTP_USER" "apikey"
        create_or_update_secret "SMTP_PASS" "$SENDGRID_KEY"
        ;;
    2)
        echo ""
        echo "Resend Setup:"
        echo "1. Sign up at https://resend.com/"
        echo "2. Create API Key"
        echo ""
        read -p "Enter Resend API Key (starts with re_): " RESEND_KEY

        create_or_update_secret "SMTP_HOST" "smtp.resend.com"
        create_or_update_secret "SMTP_PORT" "587"
        create_or_update_secret "SMTP_SECURE" "false"
        create_or_update_secret "SMTP_USER" "resend"
        create_or_update_secret "SMTP_PASS" "$RESEND_KEY"
        ;;
    3)
        echo ""
        echo "AWS SES Setup:"
        echo "1. Set up SES in AWS Console"
        echo "2. Create SMTP credentials"
        echo ""
        read -p "Enter AWS SES SMTP Username: " AWS_USER
        read -p "Enter AWS SES SMTP Password: " AWS_PASS
        read -p "Enter AWS Region (e.g., us-east-1): " AWS_REGION

        create_or_update_secret "SMTP_HOST" "email-smtp.$AWS_REGION.amazonaws.com"
        create_or_update_secret "SMTP_PORT" "587"
        create_or_update_secret "SMTP_SECURE" "false"
        create_or_update_secret "SMTP_USER" "$AWS_USER"
        create_or_update_secret "SMTP_PASS" "$AWS_PASS"
        ;;
    4)
        echo ""
        echo "⚠️  Gmail is NOT recommended for production!"
        echo "Limited to 100 emails per day."
        echo ""
        read -p "Enter Gmail address: " GMAIL_USER
        read -p "Enter Gmail App Password (16 chars): " GMAIL_PASS

        create_or_update_secret "SMTP_HOST" "smtp.gmail.com"
        create_or_update_secret "SMTP_PORT" "587"
        create_or_update_secret "SMTP_SECURE" "false"
        create_or_update_secret "SMTP_USER" "$GMAIL_USER"
        create_or_update_secret "SMTP_PASS" "$GMAIL_PASS"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# App Name
create_or_update_secret "APP_NAME" "Samaanai"

echo ""
read -p "Enter FROM Email Address (the email you verified in SendGrid): " FROM_EMAIL_ADDRESS
if [ ! -z "$FROM_EMAIL_ADDRESS" ]; then
    create_or_update_secret "FROM_EMAIL" "$FROM_EMAIL_ADDRESS"
fi

echo ""
echo "📱 Push Notifications"
echo "===================="
echo ""
echo "Get Expo Access Token:"
echo "1. Go to https://expo.dev/accounts/[your-account]/settings/access-tokens"
echo "2. Create new token"
echo ""
read -p "Enter Expo Access Token (or press Enter to skip): " EXPO_TOKEN

if [ ! -z "$EXPO_TOKEN" ]; then
    create_or_update_secret "EXPO_ACCESS_TOKEN" "$EXPO_TOKEN"
fi

echo ""
echo "🔐 Granting Cloud Run access to secrets..."
echo ""

# Update Cloud Run service with secrets
gcloud run services update $SERVICE_NAME \
  --update-secrets=SMTP_HOST=SMTP_HOST:latest,SMTP_PORT=SMTP_PORT:latest,SMTP_SECURE=SMTP_SECURE:latest,SMTP_USER=SMTP_USER:latest,SMTP_PASS=SMTP_PASS:latest,FROM_EMAIL=FROM_EMAIL:latest,APP_NAME=APP_NAME:latest \
  --region=us-central1 \
  --project=$PROJECT_ID

if [ ! -z "$EXPO_TOKEN" ]; then
    gcloud run services update $SERVICE_NAME \
      --update-secrets=EXPO_ACCESS_TOKEN=EXPO_ACCESS_TOKEN:latest \
      --region=us-central1 \
      --project=$PROJECT_ID
fi

echo ""
echo "✅ Secrets configured successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Deploy your backend to apply changes"
echo "2. Test email sending with a test user"
echo "3. Register push tokens from mobile app"
echo "4. Monitor logs for any errors"
echo ""
echo "📚 For more details, see NOTIFICATIONS_SETUP.md"
