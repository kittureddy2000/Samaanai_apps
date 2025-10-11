# Mobile Build Quick Start 🚀

Follow these steps to set up automated mobile builds for your Samaanai app.

## Step 1: Create Expo Account (5 minutes)

1. Go to https://expo.dev/signup
2. Sign up with your email or GitHub
3. Verify your email

## Step 2: Get Expo Access Token (2 minutes)

1. Go to https://expo.dev/accounts/[your-username]/settings/access-tokens
2. Click **"Create Token"**
3. Name: `GitHub Actions`
4. **Copy the token** (you won't see it again!)

## Step 3: Add Token to GitHub Secrets (2 minutes)

1. Go to https://github.com/kittureddy2000/Samaanai_apps/settings/secrets/actions/new
2. Name: `EXPO_TOKEN`
3. Value: Paste the token from Step 2
4. Click **"Add secret"**

## Step 4: Configure Your Expo Project (5 minutes)

Run these commands on your local machine:

```bash
# Navigate to mobile app
cd /Users/krishnayadamakanti/Documents/Samaanai_apps/samaanai-mobile

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Configure the project for EAS builds
eas build:configure
```

When prompted:
- **Would you like to automatically create an EAS project?** → Yes
- Select account → Choose your Expo account
- Project name → `samaanai-mobile` (or keep default)

## Step 5: Test Manual Build (5 minutes)

Trigger your first build manually:

1. Go to https://github.com/kittureddy2000/Samaanai_apps/actions/workflows/mobile-build.yml
2. Click **"Run workflow"** dropdown
3. Select:
   - Branch: `staging`
   - Platform: `android`
   - Profile: `staging`
4. Click green **"Run workflow"** button
5. Wait ~10-15 minutes for build to complete

## Step 6: Download Your APK

After the build completes:

1. Go to https://expo.dev
2. Click on **"samaanai-mobile"** project
3. Go to **"Builds"** tab
4. Find your latest Android build
5. Click **"Download"** to get the APK
6. Install on your Android device!

## What Happens Next?

### Automatic Builds
Every time you push to `staging` branch, GitHub will automatically:
- ✅ Build Android APK for staging environment
- ✅ Build iOS simulator (if on Mac)
- ✅ Connect to staging backend: https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app

### Manual Builds
You can trigger builds anytime from:
https://github.com/kittureddy2000/Samaanai_apps/actions/workflows/mobile-build.yml

## Installing APK on Android

1. Download APK from Expo dashboard
2. Transfer to Android phone (email, USB, cloud, etc.)
3. On phone: Settings → Security → Enable "Install from Unknown Sources"
4. Tap the APK file to install
5. Open "Samaanai" app!

## Troubleshooting

**Build fails with "EXPO_TOKEN not found"**
- Make sure you added the secret in GitHub: https://github.com/kittureddy2000/Samaanai_apps/settings/secrets/actions

**"Project not configured" error**
- Run `eas build:configure` in the samaanai-mobile directory
- Make sure you're logged in: `eas login`

**Can't find my build**
- Builds appear on Expo dashboard: https://expo.dev
- NOT in GitHub artifacts/releases
- Check the "Builds" tab in your project

**APK won't install**
- Enable "Unknown Sources" in Android settings
- Try Settings → Apps → Special Access → Install Unknown Apps → Chrome/Files → Allow

## Next Steps

- 📱 Share APK link with testers
- 🍎 For iOS: Need Apple Developer account ($99/year)
- 🏪 For Play Store: Set up Google Play Console
- 📊 Add crash reporting (Sentry)
- 🔔 Add push notifications (Expo Notifications)

## Useful Links

- **Your Builds**: https://expo.dev
- **Workflow**: https://github.com/kittureddy2000/Samaanai_apps/actions/workflows/mobile-build.yml
- **Full Guide**: See `MOBILE_BUILD_SETUP.md`
- **EAS Docs**: https://docs.expo.dev/build/introduction/

---

**Need Help?** Check the full setup guide in `MOBILE_BUILD_SETUP.md`
