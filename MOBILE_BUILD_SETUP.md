# Mobile Build Setup Guide

This guide explains how to set up automatic mobile app builds using Expo Application Services (EAS).

## Prerequisites

1. **Expo Account**: Create a free account at https://expo.dev
2. **EAS CLI**: Install globally: `npm install -g eas-cli`

## Setup Steps

### 1. Configure Expo Project

```bash
cd samaanai-mobile

# Login to Expo
eas login

# Configure EAS project
eas build:configure
```

This will create/update `eas.json` with your project configuration.

### 2. Create Expo Access Token

1. Go to https://expo.dev/accounts/[your-account]/settings/access-tokens
2. Click "Create Token"
3. Name it: "GitHub Actions"
4. Copy the token (you'll need it for GitHub Secrets)

### 3. Add GitHub Secret

1. Go to your GitHub repo: https://github.com/kittureddy2000/Samaanai_apps/settings/secrets/actions
2. Click "New repository secret"
3. Name: `EXPO_TOKEN`
4. Value: Paste the token from step 2
5. Click "Add secret"

### 4. Test Local Build (Optional)

Before using the automated workflow, test building locally:

```bash
cd samaanai-mobile

# Build Android APK for staging
eas build --platform android --profile staging

# Build iOS simulator for staging (Mac only)
eas build --platform ios --profile staging
```

## How It Works

### Automatic Builds

The workflow automatically builds mobile apps when:
- You push to `staging` or `main` branches
- Changes are detected in `samaanai-mobile/` directory

**Staging Branch (`staging`):**
- Builds Android APK
- Builds iOS simulator build
- Connects to: https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app

**Main Branch (`main`):**
- Builds Android APK
- Builds iOS simulator build
- Connects to production backend (when configured)

### Manual Builds

You can also trigger builds manually:

1. Go to: https://github.com/kittureddy2000/Samaanai_apps/actions/workflows/mobile-build.yml
2. Click "Run workflow"
3. Choose:
   - **Platform**: android, ios, or all
   - **Profile**: staging or production
4. Click "Run workflow"

## Build Profiles

### Staging Profile
```json
{
  "distribution": "internal",
  "env": {
    "API_BASE_URL": "https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app"
  },
  "android": {
    "buildType": "apk"
  },
  "ios": {
    "simulator": true
  }
}
```

- **Android**: Builds APK (easy to install without Play Store)
- **iOS**: Builds simulator-only (for development/testing)
- **API**: Points to staging backend

### Production Profile
```json
{
  "env": {
    "API_BASE_URL": "https://api.samaanai.com"
  }
}
```

- **Android**: Builds AAB for Play Store
- **iOS**: Builds for App Store
- **API**: Points to production backend

## Downloading Builds

After a workflow completes:

1. Check the workflow run on GitHub Actions
2. Look for the build URL in the logs
3. Go to https://expo.dev/accounts/[your-account]/projects/samaanai-mobile/builds
4. Download your APK/IPA from there

**OR** use the EAS CLI:

```bash
# List recent builds
eas build:list

# Download latest Android build
eas build:download --platform android --latest
```

## Installing on Devices

### Android APK
1. Download APK from Expo dashboard
2. Transfer to Android device
3. Enable "Install from Unknown Sources" in Settings
4. Tap APK file to install

### iOS Simulator (Mac only)
1. Download .tar.gz from Expo dashboard
2. Extract the .app file
3. Drag to iOS Simulator

### iOS Device (Requires Apple Developer Account)
For actual iOS devices, you need:
- Apple Developer account ($99/year)
- Update `eas.json` production profile with provisioning
- Build with production profile

## Troubleshooting

### Build Fails - "Missing EXPO_TOKEN"
- Make sure you added `EXPO_TOKEN` to GitHub Secrets
- Token must be from https://expo.dev/accounts/[your-account]/settings/access-tokens

### Build Fails - "Project not configured"
Run `eas build:configure` in the `samaanai-mobile` directory

### Can't Download APK
- APK is available on Expo dashboard, not GitHub
- Go to https://expo.dev and sign in to download

### iOS Build Fails
- iOS simulator builds only work on staging profile
- Production iOS requires Apple Developer account and certificates

## Next Steps

1. **Internal Testing**: Share APK with testers via link
2. **TestFlight (iOS)**: Set up TestFlight for iOS beta testing
3. **Play Store Internal Testing**: Configure Google Play Console for Android
4. **App Store**: Submit to App Store (requires Apple Developer account)

## Useful Commands

```bash
# View build status
eas build:list

# Download latest build
eas build:download --latest

# Cancel a running build
eas build:cancel

# View build logs
eas build:view [build-id]

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Distribution Guide](https://docs.expo.dev/distribution/introduction/)
