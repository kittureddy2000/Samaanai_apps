# Microsoft To Do Integration - Testing Guide

**Environment:** Staging
**Backend URL:** https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app
**Status:** Phase 1 deployed and ready for testing
**Date:** November 21, 2025

---

## Prerequisites

Before testing, you need:
1. **Samaanai account** on staging environment
2. **Microsoft personal account** (outlook.com, hotmail.com, or live.com) with To Do tasks
3. **Tasks in Microsoft To Do** to test the sync functionality

---

## Testing Flow Overview

```
1. Register/Login to Samaanai Staging
   ↓
2. Check Microsoft Integration Status (should be "not connected")
   ↓
3. Initiate Microsoft OAuth Connection
   ↓
4. Complete Microsoft Authorization (browser)
   ↓
5. Verify Connection Status (should be "connected")
   ↓
6. Trigger Manual Sync
   ↓
7. Verify Tasks Synced to Samaanai
```

---

## Step-by-Step Testing Instructions

### Step 1: Create Test Account (or use existing)

**Option A: Register New Account**
```bash
curl -X POST https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL@example.com","password":"Test1234!","username":"Test User"}'
```

**Option B: Login with Existing Account**
```bash
curl -X POST https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL@example.com","password":"YOUR_PASSWORD"}'
```

**Save the access token from the response:**
```json
{
  "accessToken": "eyJhbGci...",  // <-- Copy this
  "refreshToken": "eyJhbGci..."
}
```

**Set as environment variable:**
```bash
export TOKEN="eyJhbGci..."  # Paste your token here
```

---

### Step 2: Check Integration Status

**Before connecting to Microsoft, verify status:**
```bash
curl https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/status \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "connected": false,
  "provider": "microsoft",
  "lastSync": null
}
```

---

### Step 3: Get Microsoft OAuth Authorization URL

```bash
curl -X POST https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/connect \
  -H "Authorization: Bearer $TOKEN"
```

**Response will contain:**
```json
{
  "authorizationUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=...",
  "state": "..."
}
```

**Copy the `authorizationUrl` and open it in your browser.**

---

### Step 4: Complete Microsoft Authorization (Browser)

1. **Open the authorization URL in your browser**
2. **Login with your Microsoft account** (outlook.com, hotmail.com, live.com)
3. **Grant permissions** when prompted:
   - "Read and write your tasks" (Tasks.ReadWrite)
   - "Maintain access to data" (offline_access)
4. **You'll be redirected back** to the callback URL
5. **Check for success** - you should see a success message or be redirected

**Callback URL:**
```
https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/callback
```

---

### Step 5: Verify Connection Status

**After completing OAuth, check status again:**
```bash
curl https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/status \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (after successful connection):**
```json
{
  "connected": true,
  "provider": "microsoft",
  "lastSync": null
}
```

---

### Step 6: Trigger Manual Sync

**Sync tasks from Microsoft To Do to Samaanai:**
```bash
curl -X POST https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/sync \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "imported": 5,
  "updated": 0,
  "errors": 0,
  "details": {
    "imported": ["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"],
    "updated": [],
    "errors": []
  }
}
```

---

### Step 7: Verify Tasks in Samaanai

**Get all tasks from Samaanai:**
```bash
curl https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/todo/tasks \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "tasks": [
    {
      "id": "...",
      "title": "Buy groceries",
      "description": "",
      "completed": false,
      "dueDate": "2025-11-25T00:00:00.000Z",
      "microsoftTodoId": "AAMkAGI1..."  // <-- Microsoft ID indicates synced task
    },
    {
      "id": "...",
      "title": "Complete project report",
      "completed": false,
      "microsoftTodoId": "AAMkAGI2..."
    }
  ]
}
```

**Key field to check:** `microsoftTodoId` - If present, the task was synced from Microsoft To Do.

---

### Step 8: Test Sync Again (with updates)

**Update a task in Microsoft To Do** (in the Microsoft To Do app or web):
- Mark a task as complete
- Add a new task
- Edit task title/description

**Then sync again:**
```bash
curl -X POST https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/sync \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "imported": 1,   // New tasks
  "updated": 1,    // Updated tasks
  "errors": 0
}
```

---

### Step 9: Disconnect Integration (Optional)

**To remove the Microsoft integration:**
```bash
curl -X DELETE https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/disconnect \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "message": "Microsoft integration disconnected successfully"
}
```

**Note:** Tasks already synced to Samaanai will remain, but their `microsoftTodoId` will stay intact for reference.

---

## Test Scenarios

### Scenario 1: Fresh Connection + First Sync
1. New user with no prior Microsoft connection
2. Connect Microsoft account
3. Sync tasks → All Microsoft tasks imported

**Expected:** All tasks from default Microsoft To Do list appear in Samaanai with `microsoftTodoId`.

---

### Scenario 2: Sync After Task Updates
1. User already connected
2. Update tasks in Microsoft To Do (complete/add/edit)
3. Trigger sync
4. Verify updates reflected in Samaanai

**Expected:**
- Completed tasks in Microsoft → marked completed in Samaanai
- New tasks in Microsoft → new tasks in Samaanai
- Edited tasks → updated in Samaanai

---

### Scenario 3: Duplicate Detection
1. Sync tasks from Microsoft
2. Manually create same task in Samaanai
3. Sync again

**Expected:** System should detect duplicates by `microsoftTodoId` and not create duplicates.

---

### Scenario 4: Token Refresh
1. Connect Microsoft (access token expires in ~1 hour)
2. Wait for token expiration
3. Trigger sync after expiration

**Expected:** System automatically refreshes token using refresh token and sync succeeds.

---

### Scenario 5: Disconnect and Reconnect
1. Connect Microsoft
2. Sync tasks
3. Disconnect
4. Reconnect with same account
5. Sync again

**Expected:** Tasks already synced are updated, no duplicates created.

---

## Common Issues & Troubleshooting

### Issue 1: "Invalid email or password"
**Solution:** User doesn't exist in staging database. Register first.

---

### Issue 2: "Token expired" or 401 Unauthorized
**Solution:** Your JWT token expired (7-day validity). Login again to get new token.

---

### Issue 3: Microsoft OAuth fails with "redirect_uri mismatch"
**Cause:** Microsoft Azure app registration redirect URI doesn't match staging URL.

**Solution:** Update Microsoft app registration to include:
```
https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/microsoft/callback
```

---

### Issue 4: Sync returns "No integration found"
**Cause:** User hasn't completed OAuth flow or connection failed.

**Solution:** Complete Step 3-4 again to establish connection.

---

### Issue 5: No tasks synced (imported: 0)
**Possible Causes:**
- Microsoft To Do account has no tasks
- User selected wrong Microsoft account
- Permissions not granted during OAuth

**Solution:**
- Verify tasks exist in Microsoft To Do app
- Disconnect and reconnect with correct account
- Ensure all permissions granted during OAuth

---

## Logging & Debugging

**View staging logs to debug issues:**
```bash
gcloud run services logs read samaanai-backend-staging \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126 \
  --limit=50
```

**Filter for Microsoft integration logs:**
```bash
gcloud run services logs read samaanai-backend-staging \
  --region=us-west1 \
  --project=samaanai-stg-1009-124126 \
  --limit=100 | grep -i microsoft
```

---

## Database Verification

**Connect to staging database:**
```bash
# Start Cloud SQL Proxy
./cloud-sql-proxy samaanai-stg-1009-124126:us-west1:samaanai-backend-staging-db --port 5440

# Connect to database
PGPASSWORD=250qOvjFJuzQWStGeTPlOUFPW psql -h localhost -p 5440 -U samaanai_backend -d samaanai_staging
```

**Check integrations table:**
```sql
SELECT
  id,
  user_id,
  provider,
  created_at,
  expires_at
FROM integrations
WHERE provider = 'microsoft';
```

**Check synced tasks:**
```sql
SELECT
  id,
  title,
  completed,
  "microsoftTodoId"
FROM "Task"
WHERE "microsoftTodoId" IS NOT NULL;
```

---

## Current Implementation Status

### ✅ Phase 1 - Complete (Deployed to Staging)
- OAuth 2.0 authentication with Microsoft
- Token storage and refresh
- Manual sync: Microsoft To Do → Samaanai (one-way)
- Integration status tracking
- Disconnect functionality

### 🚧 Phase 2 - Planned (Not Implemented)
- Two-way sync: Samaanai → Microsoft To Do
- Webhook support for real-time updates
- Automatic background sync
- Multiple Microsoft To Do lists support
- Conflict resolution for simultaneous edits

---

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/integrations/microsoft/status` | Required | Check connection status |
| POST | `/api/v1/integrations/microsoft/connect` | Required | Get OAuth URL |
| GET | `/api/v1/integrations/microsoft/callback` | Not Required | OAuth callback |
| POST | `/api/v1/integrations/microsoft/sync` | Required | Manual sync |
| DELETE | `/api/v1/integrations/microsoft/disconnect` | Required | Remove integration |

---

## Success Criteria

The Microsoft To Do integration is considered working if:

1. ✅ User can complete OAuth flow without errors
2. ✅ Connection status shows `connected: true` after OAuth
3. ✅ Manual sync imports tasks from Microsoft To Do
4. ✅ Synced tasks have `microsoftTodoId` field populated
5. ✅ Completed tasks in Microsoft are marked completed in Samaanai
6. ✅ New tasks in Microsoft appear in Samaanai after sync
7. ✅ No duplicate tasks created on subsequent syncs
8. ✅ Token refresh works automatically
9. ✅ Disconnect removes integration without errors

---

## Next Steps After Testing

1. **Test in mobile app:** Update mobile app to add "Connect Microsoft" button
2. **Production deployment:** After staging validation, deploy to production via PR
3. **Phase 2 implementation:** Two-way sync and webhooks
4. **User documentation:** Create user-facing guide for mobile app

---

**Last Updated:** November 21, 2025
**Tested By:** _[Your name after testing]_
**Status:** Ready for testing
