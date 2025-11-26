# Google Tasks Integration Documentation

## Overview

The Samaanai application integrates with Google Tasks API to allow users to sync their Google Tasks into the Samaanai platform. This integration provides a one-way sync from Google Tasks to Samaanai, enabling users to view and manage all their tasks from Google Tasks within the Samaanai application.

## Features

- **OAuth 2.0 Authentication**: Secure authentication using Google OAuth 2.0 with offline access
- **One-way Task Sync**: Import tasks from Google Tasks to Samaanai
- **Multi-list Support**: Syncs tasks from all Google Task lists
- **Status Tracking**: Maintains completion status and completion timestamps
- **Due Date Support**: Preserves due dates from Google Tasks
- **Token Management**: Automatic refresh token handling

## Architecture

### Backend Components

#### 1. Google Tasks Service (`src/services/googleTasksService.js`)

The core service that handles all Google Tasks API interactions:

- **OAuth Client Setup**: Configures Google OAuth2 client with credentials
- **Authentication Flow**:
  - Generates OAuth authorization URLs with state parameter for user identification
  - Handles OAuth callback and token exchange
  - Stores access and refresh tokens in the database
- **Token Management**:
  - Automatic token refresh when expired
  - Updates database with new tokens
- **Task Synchronization**:
  - Fetches all task lists for a user
  - Retrieves tasks from each list
  - Upserts tasks into Samaanai database using `googleTaskId` as unique identifier

**Key Methods:**
- `getAuthUrl(userId)` - Generates OAuth URL for user authorization
- `handleCallback(code, userId)` - Processes OAuth callback and stores tokens
- `getAuthenticatedClient(userId)` - Returns authenticated Google API client
- `syncTasks(userId)` - Syncs all tasks from Google Tasks to Samaanai

#### 2. Integration Routes (`src/routes/integrations.js`)

API endpoints for Google Tasks integration:

```
GET  /api/v1/integrations/google/connect     - Initiate OAuth flow
GET  /api/v1/integrations/google/callback    - OAuth callback handler
POST /api/v1/integrations/google/sync        - Trigger manual task sync
```

**Route Details:**

- **Connect**: Returns OAuth authorization URL to client
- **Callback**: Exchanges authorization code for tokens, stores in database, redirects to frontend
- **Sync**: Triggers task synchronization, returns sync statistics

### Database Schema

#### Integration Model

Stores OAuth tokens and integration metadata:

```prisma
model Integration {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  provider     String    // 'google_tasks'
  accessToken  String    @map("access_token")
  refreshToken String?   @map("refresh_token")
  expiresAt    DateTime? @map("expires_at")
  scope        String?
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@map("integrations")
}
```

#### Task Model Enhancement

Tasks table includes Google Task ID for sync tracking:

```prisma
model Task {
  id             String    @id @default(uuid())
  userId         String    @map("user_id")
  name           String
  description    String?
  dueDate        DateTime? @map("due_date") @db.Date
  completed      Boolean   @default(false)
  completedAt    DateTime? @map("completed_at")
  googleTaskId   String?   @unique @map("google_task_id")
  // ... other fields

  @@map("todo_task")
}
```

### Frontend Integration

#### Mobile App (React Native)

The mobile app provides UI for connecting and syncing Google Tasks:

**Profile Screen** (`samaanai-mobile/src/screens/ProfileScreen.js`):
- Displays Google Tasks connection status
- "Connect Google Tasks" button to initiate OAuth flow
- Opens OAuth URL in browser for user authorization

**Todo Screen** (`samaanai-mobile/src/screens/todo/TodoScreen.js`):
- Displays synced tasks from Google Tasks
- Shows Google Tasks icon/badge for imported tasks
- Manual sync trigger button

**API Service** (`samaanai-mobile/src/services/api.js`):
- `connectGoogleTasks()` - Initiates OAuth flow
- `syncGoogleTasks()` - Triggers task synchronization
- `getGoogleTasksStatus()` - Checks connection status

## OAuth Flow

### 1. User Initiates Connection

```
Mobile App → GET /api/v1/integrations/google/connect
         ← { url: "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

### 2. User Authorizes in Browser

```
Browser → Google OAuth Consent Screen
        → User grants permissions
        → Redirect to callback URL with code
```

### 3. Backend Handles Callback

```
Google → GET /api/v1/integrations/google/callback?code=...&state=userId
      → Backend exchanges code for tokens
      → Stores tokens in database
      → Redirects to frontend with success status
```

### 4. User Syncs Tasks

```
Mobile App → POST /api/v1/integrations/google/sync
Backend    → Fetches all task lists
           → Fetches tasks from each list
           → Upserts into Samaanai database
         ← { success: true, synced: 42 }
```

## Environment Variables

Required environment variables for Google Tasks integration:

```bash
# OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# OAuth Callback URL
GOOGLE_CALLBACK_URL_INTEGRATION=https://api.samaanai.com/api/v1/integrations/google/callback

# Or use default: ${API_BASE_URL}/api/v1/integrations/google/callback
API_BASE_URL=https://api.samaanai.com

# Frontend URL for redirects
FRONTEND_URL=https://app.samaanai.com
```

## Google Cloud Console Setup

### 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Choose application type: "Web application"
6. Add authorized redirect URIs:
   - Staging: `https://samaanai-backend-staging-hdp6ioqupa-uw.a.run.app/api/v1/integrations/google/callback`
   - Production: `https://api.samaanai.com/api/v1/integrations/google/callback`

### 2. Enable Google Tasks API

1. Navigate to "APIs & Services" > "Library"
2. Search for "Google Tasks API"
3. Click "Enable"

### 3. Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Configure app information:
   - App name: "Samaanai"
   - User support email
   - Developer contact email
3. Add scopes:
   - `https://www.googleapis.com/auth/tasks.readonly`
4. Add test users (for testing phase)

## API Scopes

The integration requests the following Google API scopes:

- `https://www.googleapis.com/auth/tasks.readonly` - Read access to user's Google Tasks

**Note**: Currently using read-only scope for one-way sync. Future enhancements may require additional scopes for two-way sync.

## Sync Behavior

### Task Matching

Tasks are matched using the `googleTaskId` field:
- If a task with the same `googleTaskId` exists: **UPDATE** existing task
- If no match found: **CREATE** new task

### Field Mapping

| Google Tasks Field | Samaanai Field | Notes |
|-------------------|----------------|-------|
| `id` | `googleTaskId` | Unique identifier for sync |
| `title` | `name` | Required field |
| `notes` | `description` | Optional |
| `status` | `completed` | 'completed' → true, others → false |
| `completed` | `completedAt` | Timestamp when completed |
| `due` | `dueDate` | ISO date string |

### Sync Limitations

- **One-way sync**: Changes in Samaanai are NOT synced back to Google Tasks
- **No deletion sync**: Deleted tasks in Google Tasks remain in Samaanai
- **Manual trigger**: Sync must be initiated manually by user (no automatic background sync yet)

## Deployment

### Database Migration

Migration file: `prisma/migrations/20251125000000_add_google_task_id/migration.sql`

```sql
ALTER TABLE "todo_task" ADD COLUMN "google_task_id" TEXT;
CREATE UNIQUE INDEX "todo_task_google_task_id_key" ON "todo_task"("google_task_id");
```

Apply migration:
```bash
npx prisma migrate deploy
```

### Secrets Management

Store credentials in Google Cloud Secret Manager:

```bash
# Create secrets
gcloud secrets create GOOGLE_CLIENT_ID --data-file=- --project=your-project
gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=- --project=your-project

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding GOOGLE_CLIENT_ID \
  --member=serviceAccount:your-service-account@project.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

Secrets are automatically injected into Cloud Run via deployment workflow.

## Troubleshooting

### Common Issues

#### 1. "Google Tasks integration not found for user"

**Cause**: User hasn't connected Google Tasks or tokens were deleted

**Solution**: User needs to reconnect via OAuth flow

#### 2. Token Expiration

**Cause**: Access token expired and refresh failed

**Solution**:
- Check refresh token is stored in database
- Verify OAuth was initiated with `access_type: 'offline'` and `prompt: 'consent'`
- User may need to reconnect if refresh token is invalid

#### 3. "No task lists found"

**Cause**: User has no task lists in Google Tasks

**Solution**: This is expected behavior, sync returns `{ synced: 0, message: 'No task lists found' }`

#### 4. Migration Failed - Wrong Flag

**Error**: `ERROR: unrecognized arguments: --add-cloudsql-instances`

**Solution**: Fixed in workflow file (`deploy-backend-staging-prod.yml` line 291):
- Changed from `--add-cloudsql-instances` to `--set-cloudsql-instances`
- Migration now runs correctly during deployment

## Future Enhancements

### Planned Features

1. **Two-way Sync**:
   - Push changes from Samaanai back to Google Tasks
   - Requires additional OAuth scopes (not readonly)

2. **Automatic Background Sync**:
   - Scheduled sync using Cloud Scheduler or cron jobs
   - Configurable sync frequency per user

3. **Webhook Support**:
   - Real-time sync using Google Cloud Pub/Sub notifications
   - Immediate updates when tasks change in Google Tasks

4. **Selective Sync**:
   - Allow users to choose which task lists to sync
   - Filter tasks by labels, due dates, etc.

5. **Conflict Resolution**:
   - Handle conflicts when same task modified in both systems
   - User-configurable resolution strategies

6. **Deletion Sync**:
   - Track and sync task deletions
   - Soft delete vs hard delete options

## Testing

### Manual Testing Steps

1. **Connect Integration**:
   ```bash
   curl -X GET http://localhost:8080/api/v1/integrations/google/connect \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

2. **Complete OAuth Flow**:
   - Open returned URL in browser
   - Sign in with Google account
   - Grant permissions
   - Verify redirect to callback URL

3. **Trigger Sync**:
   ```bash
   curl -X POST http://localhost:8080/api/v1/integrations/google/sync \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

4. **Verify Database**:
   ```sql
   SELECT * FROM integrations WHERE provider = 'google_tasks';
   SELECT * FROM todo_task WHERE google_task_id IS NOT NULL;
   ```

### Test Accounts

For development and testing, add test accounts in Google Cloud Console OAuth consent screen.

## Security Considerations

- **Token Storage**: Access and refresh tokens stored encrypted in database
- **Scope Limitations**: Only requests necessary scopes (currently readonly)
- **State Parameter**: OAuth state parameter used to prevent CSRF attacks
- **HTTPS Only**: All OAuth redirects require HTTPS
- **Token Rotation**: Refresh tokens automatically rotated when refreshed
- **User Isolation**: Each integration tied to specific user via foreign key

## Monitoring and Logging

### Log Events

The service logs the following events:

- OAuth token refresh: `"Refreshing Google Tasks tokens"`
- Sync errors: `"Error syncing Google Tasks for user {userId}"`
- Callback errors: `"Error handling Google callback"`

### Metrics to Monitor

- Number of active Google Tasks integrations
- Sync success/failure rates
- Token refresh frequency
- API quota usage

## Related Documentation

- [Microsoft To Do Integration](./MICROSOFT_TODO_INTEGRATION.md) - Similar integration pattern
- [Project Overview](./PROJECT_OVERVIEW.md) - Overall project documentation
- [Deployment Summary](./DEPLOYMENT_SUMMARY.md) - Deployment procedures

## Support

For issues or questions:
- Check logs in Google Cloud Logging
- Review this documentation
- Check Google Tasks API quotas and limits
- Verify OAuth credentials are correct

---

**Last Updated**: November 25, 2025
**Database Migration**: Applied to staging (2025-11-26)
