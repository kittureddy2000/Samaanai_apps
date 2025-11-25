#!/bin/bash

# Push Token Manual Registration Script
# Use this script to manually register your push token when you have access to your phone

set -e

echo "=========================================="
echo "Push Token Manual Registration Tool"
echo "=========================================="
echo ""

# Configuration
PROD_BACKEND="https://samaanai-backend-362270100637.us-west1.run.app"
EMAIL="kittureddy2000@gmail.com"

echo "ℹ️  This script will help you manually register your push token"
echo "   Backend: $PROD_BACKEND"
echo "   Email: $EMAIL"
echo ""

# Step 1: Get password
echo "Step 1: Login to get JWT token"
echo "================================"
read -s -p "Enter your password: " PASSWORD
echo ""

# Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$PROD_BACKEND/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken', ''))" 2>/dev/null || echo "")

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful!"
echo ""

# Step 2: Get push token from user
echo "Step 2: Get your push token"
echo "============================"
echo ""
echo "To get your push token, you need to extract it from your mobile app."
echo ""
echo "Option A: From mobile app logs (if you have Metro bundler running):"
echo "  1. Open the mobile app"
echo "  2. Look for logs that say 'Expo push token obtained: ExponentPushToken[...]'"
echo "  3. Copy the token (should look like: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx])"
echo ""
echo "Option B: From AsyncStorage (using React Native Debugger or adb):"
echo "  adb shell run-as com.yourapp cat /data/data/com.yourapp/files/RCTAsyncLocalStorage_V1/expoPushToken"
echo ""
echo "Option C: From the test notification button code:"
echo "  - The test button works, which means the token exists"
echo "  - Add temporary logging in Settings screen to console.log the token"
echo ""
read -p "Enter your push token (e.g., ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]): " PUSH_TOKEN

if [ -z "$PUSH_TOKEN" ]; then
  echo "❌ No push token provided!"
  exit 1
fi

# Validate token format
if [[ ! "$PUSH_TOKEN" =~ ^ExponentPushToken\[.+\]$ ]]; then
  echo "⚠️  Warning: Token doesn't match expected format 'ExponentPushToken[...]'"
  read -p "Continue anyway? (y/n): " CONFIRM
  if [ "$CONFIRM" != "y" ]; then
    exit 1
  fi
fi

echo ""
echo "Step 3: Register push token"
echo "============================"
echo "Token: $PUSH_TOKEN"
echo ""

# Register push token
REGISTER_RESPONSE=$(curl -s -X POST "$PROD_BACKEND/api/v1/user/push-token" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"pushToken\":\"$PUSH_TOKEN\"}")

# Check response
SUCCESS=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null || echo "false")

if [ "$SUCCESS" = "True" ] || [ "$SUCCESS" = "true" ]; then
  echo "✅ Push token registered successfully!"
  echo ""
  echo "Response: $REGISTER_RESPONSE"
  echo ""
  echo "=========================================="
  echo "Next Steps:"
  echo "=========================================="
  echo ""
  echo "1. Wait for the next scheduled notification time (runs every 30 minutes)"
  echo "2. Or trigger a notification manually by updating your notification time to match current UTC time"
  echo "3. Check production logs to verify notifications are being sent:"
  echo ""
  echo "   gcloud logging read \\"
  echo "     'resource.type=cloud_run_revision \\"
  echo "      AND resource.labels.service_name=samaanai-backend \\"
  echo "      AND textPayload=~\"Sent .* push notifications\"' \\"
  echo "     --project=samaanai-prod-1009-124126 \\"
  echo "     --limit=10"
  echo ""
  echo "4. You should now start receiving scheduled push notifications!"
  echo ""
else
  echo "❌ Push token registration failed!"
  echo ""
  echo "Response: $REGISTER_RESPONSE"
  echo ""
  echo "Possible issues:"
  echo "- Invalid token format"
  echo "- Backend error"
  echo "- Network issue"
  echo ""
  exit 1
fi
