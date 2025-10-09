# Google OAuth Setup Guide

This guide will help you set up Google OAuth for the Samaanai app.

## Prerequisites

- Google Cloud Console account
- Backend server running
- Expo app configured

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted:
   - Choose "External" for user type
   - Fill in required fields (App name, User support email, Developer email)
   - Add scopes: `userinfo.email`, `userinfo.profile`
   - Save and continue

4. Create OAuth Client ID:
   - Application type: "Web application"
   - Name: "Samaanai Backend"
   - Authorized JavaScript origins:
     - `http://localhost:8080`
     - Add your production URL when deploying
   - Authorized redirect URIs:
     - `http://localhost:8080/api/v1/auth/google/callback`
     - `https://auth.expo.io/@your-expo-username/samaanai-mobile` (for Expo)
     - Add your production callback URL when deploying

5. Click "Create" and save your credentials:
   - Client ID
   - Client Secret

## Step 3: Update Backend Environment Variables

Update `/backend-express/.env`:

```env
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=exp://localhost:8081
```

For production, update these to use your production URLs.

## Step 4: Update app.json (Expo Configuration)

Add the following to `/samaanai-mobile/app.json`:

```json
{
  "expo": {
    "scheme": "samaanai",
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

## Step 5: Test the Integration

1. Rebuild your Docker containers:
   ```bash
   docker-compose down
   docker-compose up --build
   ```

2. Restart your Expo app:
   ```bash
   cd samaanai-mobile
   npx expo start --clear
   ```

3. Test the login flow:
   - Open the app
   - Click "Continue with Google"
   - Sign in with your Google account
   - You should be redirected back to the app and logged in

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Ensure the callback URL in Google Console exactly matches the one in your .env file
   - Check that you've added all necessary redirect URIs

2. **"Access blocked" error**
   - Make sure you've published your OAuth consent screen
   - Or add your test email addresses to the test users list

3. **Token not received**
   - Check backend logs for errors
   - Verify environment variables are loaded correctly
   - Ensure CORS is configured to allow your frontend origin

4. **Database errors**
   - Make sure the `google_id` column exists in the `auth_user` table
   - Run `docker-compose exec backend npx prisma db push` if needed

## Security Notes

- Never commit `.env` files with real credentials to version control
- Use different credentials for development and production
- Regularly rotate your client secrets
- Monitor OAuth usage in Google Cloud Console

## Production Deployment

When deploying to production:

1. Update OAuth credentials in Google Console with production URLs
2. Update backend environment variables with production values
3. Update Expo app configuration with production scheme
4. Consider using environment-specific configurations
5. Enable additional security features (rate limiting, etc.)

## Support

For issues related to:
- Google OAuth: Check [Google Identity Platform docs](https://developers.google.com/identity)
- Expo Auth: Check [Expo Auth Session docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- Backend setup: Check application logs
