# Push Notifications - Mobile App Setup

## ✅ What's Been Implemented

### 1. Notification Service (`src/services/notificationService.js`)
- ✅ Permission request handling
- ✅ Expo push token registration
- ✅ Notification listeners (received & tapped)
- ✅ Android notification channel setup
- ✅ Local notification scheduling (for testing)
- ✅ Badge count management (iOS)

### 2. API Integration (`src/services/api.js`)
- ✅ `registerPushToken()` endpoint added
- ✅ Communicates with backend `/api/v1/user/push-token`

### 3. Authentication Flow (`src/contexts/AuthContext.js`)
- ✅ Auto-registration on login
- ✅ Auto-registration on signup
- ✅ Auto-registration on Google OAuth
- ✅ Auto-registration on app launch (if already logged in)

### 4. App-Level Integration (`App.js`)
- ✅ Notification received listener (foreground)
- ✅ Notification tapped listener (navigation)
- ✅ Proper cleanup on unmount

### 5. Configuration (`app.json`)
- ✅ iOS background notification modes
- ✅ Android notification API configuration
- ✅ Notification icon and color settings
- ✅ expo-notifications plugin configured

## 📱 Testing the Integration

### Test 1: Push Token Registration

**Prerequisites:**
- Physical device (push notifications don't work in simulator/emulator)
- Or use Expo Go app on physical device

**Steps:**
1. Start the app:
   ```bash
   cd samaanai-mobile
   npm start
   ```

2. Login or register with a new account

3. Check the console logs for:
   ```
   Expo push token obtained: ExponentPushToken[xxxxxxxxxxxxx]
   Registering push token with backend: ExponentPushToken[xxxxxxxxxxxxx]
   Push token registered successfully
   ```

4. Verify in backend that token was saved:
   ```bash
   # Query the user profile to see if pushToken is set
   curl -X GET https://your-backend/api/v1/user/preferences \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Test 2: Send Test Push Notification via Expo

**Using Expo's Push Notification Tool:**

1. Go to: https://expo.dev/notifications

2. Fill in:
   - **Expo Push Token**: Use the token from your console logs
   - **Title**: "Test Notification"
   - **Message**: "This is a test from Expo"
   - **JSON Data**:
     ```json
     {
       "type": "test",
       "screen": "dashboard"
     }
     ```

3. Click "Send a Notification"

4. Check your device:
   - If app is in **foreground**: You'll see console log
   - If app is in **background**: You'll receive a notification
   - **Tap the notification**: Should log the data to console

### Test 3: Backend-Triggered Notifications

**Option A: Trigger Welcome Email & Push (on new user registration)**

1. Register a new user in the app
2. Check your email for welcome email
3. Check device for welcome push notification

**Option B: Manual Weekly Report (Backend)**

```javascript
// In backend, use the scheduler service
const { sendWeeklyReportForUser } = require('./services/schedulerService');

// Send report to specific user
await sendWeeklyReportForUser('user-id-here');
```

**Option C: Test Task Reminders**

1. Create a task with due date = today or tomorrow
2. Wait for scheduled jobs to run (9 AM or 6 PM PST)
3. Or manually trigger from backend:
   ```javascript
   const { sendTaskReminders } = require('./services/schedulerService');
   await sendTaskReminders();
   ```

### Test 4: Notification Handling

**Test foreground notifications:**
1. Keep app open
2. Send a push notification (via Expo tool)
3. Should see: Console log with notification data

**Test background notifications:**
1. Minimize the app
2. Send a push notification
3. Should see: System notification appear
4. Tap notification
5. Should see: App opens, console logs the tap event

**Test notification data handling:**
1. Send notification with custom data:
   ```json
   {
     "type": "task_reminder",
     "taskId": "some-task-id-123"
   }
   ```
2. Tap notification
3. Check console for navigation intent logs

## 🔧 Configuration Details

### Environment Variables (Backend)

Make sure these are set in all environments:

**Development (`.env`)**
```bash
EXPO_ACCESS_TOKEN=your-expo-token
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-sendgrid-key
FROM_EMAIL=your-email@example.com
```

**Staging & Production (Google Cloud Secrets)**
```bash
# Check if secrets exist
gcloud secrets list --project=samaanai-stg-1009-124126 | grep EXPO
gcloud secrets list --project=samaanai-prod-1009-124126 | grep EXPO

# If missing, add them
echo "your-expo-token" | gcloud secrets create EXPO_ACCESS_TOKEN --data-file=- --project=samaanai-stg-1009-124126
```

### User Preferences

Users can control notifications via the Preferences screen:

- `notifications` (Boolean) - Push notifications on/off
- `emailNotifications` (Boolean) - Email notifications on/off
- `weeklyReports` (Boolean) - Weekly reports on/off

These are stored in the database and respected by the backend scheduler.

## 📅 Scheduled Notifications

The backend automatically sends:

| Schedule | Type | Condition |
|----------|------|-----------|
| Monday 8:00 AM PST | Weekly Report | `weeklyReports: true` |
| Daily 9:00 AM PST | Task Reminders | Tasks due today/tomorrow |
| Daily 6:00 PM PST | Task Reminders | Tasks due today/tomorrow |

**Verify scheduled jobs are running:**
```bash
# Check staging logs
gcloud run services logs read samaanai-backend-staging \
  --region=us-central1 \
  --project=samaanai-stg-1009-124126 \
  --limit=100 | grep -i "scheduler\|notification"

# Check production logs
gcloud run services logs read samaanai-backend \
  --region=us-central1 \
  --project=samaanai-prod-1009-124126 \
  --limit=100 | grep -i "scheduler\|notification"
```

## 🐛 Troubleshooting

### Issue: "Push notifications only work on physical devices"
**Solution:** Use a physical device or Expo Go app. Simulators/emulators don't support push notifications.

### Issue: Token not registering with backend
**Symptoms:** Console shows token obtained but no "registered successfully" message

**Debug:**
1. Check network tab for failed API calls
2. Verify backend `/api/v1/user/push-token` endpoint is accessible
3. Check authentication token is valid
4. Check backend logs for errors

### Issue: No notifications received
**Check:**
1. ✅ Device has notification permissions granted
2. ✅ User preferences have `notifications: true`
3. ✅ Push token is valid (starts with `ExponentPushToken[`)
4. ✅ Backend has `EXPO_ACCESS_TOKEN` configured
5. ✅ Expo token is from the correct Expo account

**Verify token is valid:**
```bash
# Try sending via Expo's tool: https://expo.dev/notifications
```

### Issue: Notifications work in dev but not production
**Check:**
1. Production backend has `EXPO_ACCESS_TOKEN` secret
2. Production build has correct `app.json` configuration
3. APK/IPA was built with EAS Build (not Expo Go)
4. For production APKs, ensure proper signing

### Issue: Android notifications not showing
**Check:**
1. Notification channel is created (check logs for "setNotificationChannelAsync")
2. Android permissions granted (should auto-request on first launch)
3. `useNextNotificationsApi: true` is in `app.json`

### Issue: iOS notifications not showing
**Check:**
1. Physical device (not simulator)
2. Notification permissions granted
3. `UIBackgroundModes` includes "remote-notification" in `app.json`

## 🚀 Next Steps

### Production Deployment

1. **Build APK/IPA with EAS:**
   ```bash
   cd samaanai-mobile
   eas build --platform android --profile production
   eas build --platform ios --profile production
   ```

2. **Verify secrets in production:**
   ```bash
   gcloud secrets versions access latest --secret=EXPO_ACCESS_TOKEN --project=samaanai-prod-1009-124126
   ```

3. **Test on production backend:**
   - Register a test user
   - Verify push token is saved
   - Send test notification via Expo tool

### Advanced Features (Future Enhancements)

- [ ] Rich notifications with images
- [ ] Action buttons on notifications
- [ ] Grouped notifications (Android)
- [ ] Custom notification sounds
- [ ] Scheduled local reminders
- [ ] Notification analytics/tracking
- [ ] Deep linking from notifications

## 📚 Resources

- [Expo Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push Notification Tool](https://expo.dev/notifications)
- [Testing Push Notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Backend Implementation](../backend-express/src/services/pushNotificationService.js)

## ✅ Success Checklist

- [ ] expo-notifications package installed
- [ ] expo-device package installed
- [ ] notificationService.js created
- [ ] API endpoint added for push token registration
- [ ] AuthContext registers tokens on login/signup
- [ ] App.js has notification listeners
- [ ] app.json configured for notifications
- [ ] Tested on physical device
- [ ] Notifications received successfully
- [ ] Backend secrets configured (all environments)
- [ ] User preferences work correctly
- [ ] Scheduled jobs running in production

---

**Status**: ✅ **FULLY IMPLEMENTED AND READY TO TEST**

Test on a physical device to verify full functionality!
