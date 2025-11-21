# Microsoft To Do Integration - Implementation Plan

## Executive Summary

This plan outlines the implementation of Microsoft To Do sync functionality **directly in the Samaanai backend application**, replacing the n8n workflow approach. Users will be able to connect their Microsoft account and sync their To Do tasks into Samaanai.

**Status:** Ready for implementation
**Approach:** Native backend integration (not n8n)
**Last Updated:** 2025-11-20

---

## Current State Analysis

### Existing Infrastructure
- **Database Schema**: `Integration` model exists for storing OAuth tokens (prisma/schema.prisma:36-51)
- **Task Model**: Already has `microsoftTodoId` field for tracking synced tasks (prisma/schema.prisma:150)
- **Authentication Pattern**: Google OAuth implemented using Passport.js (src/config/passport.js)
- **Branch Protection**: Main branch already protected (requires 1 PR approval)
- **Current Branch**: `feature/microsoft-sync` (development branch)

### Git Workflow
```
feature/microsoft-sync (current) → staging → main (production)
```

### Key Observations
- No Integration controller/routes exist yet
- Integration model is defined but not used
- Google OAuth pattern can be replicated for Microsoft
- Task controller already handles CRUD operations
- JWT authentication middleware in place

---

## Architecture Design

### 1. OAuth 2.0 Flow

**Microsoft Graph API Scopes Required:**
- `Tasks.ReadWrite` - Read and write user's tasks
- `offline_access` - Get refresh tokens for background sync

**OAuth Flow:**
```
User clicks "Connect Microsoft To Do" in app
  ↓
Backend generates authorization URL
  ↓
User redirected to Microsoft OAuth consent screen
  ↓
User grants permission
  ↓
Microsoft redirects back to callback URL with authorization code
  ↓
Backend exchanges code for access + refresh tokens
  ↓
Tokens stored in Integration table (encrypted if needed)
  ↓
User can now sync tasks
```

### 2. API Endpoints

#### Integration Management
```
POST   /api/v1/integrations/microsoft/connect
  Description: Initiates OAuth flow
  Auth: Required (JWT)
  Returns: { authorizationUrl: string }

GET    /api/v1/integrations/microsoft/callback
  Description: Handles OAuth callback
  Query Params: code, state
  Auth: Not required (validates state parameter)
  Returns: Success page or redirect to app

GET    /api/v1/integrations/microsoft/status
  Description: Returns connection status
  Auth: Required (JWT)
  Returns: {
    connected: boolean,
    lastSync: DateTime | null,
    provider: 'microsoft'
  }

DELETE /api/v1/integrations/microsoft/disconnect
  Description: Removes integration and tokens
  Auth: Required (JWT)
  Returns: { message: 'Disconnected successfully' }
```

#### Task Sync
```
POST   /api/v1/integrations/microsoft/sync
  Description: Triggers manual sync
  Auth: Required (JWT)
  Body (optional): { listId: string }
  Returns: {
    success: boolean,
    results: {
      created: number,
      updated: number,
      skipped: number,
      errors: number
    },
    tasks: Task[]
  }

GET    /api/v1/integrations/microsoft/lists
  Description: Lists available Microsoft To Do lists
  Auth: Required (JWT)
  Returns: {
    lists: [{ id: string, displayName: string }]
  }
```

### 3. Database Schema

**No schema changes needed** - existing schema is sufficient:

```prisma
model Integration {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  provider     String    // 'microsoft'
  accessToken  String    @map("access_token")
  refreshToken String?   @map("refresh_token")
  expiresAt    DateTime? @map("expires_at")
  scope        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@unique([userId, provider])
  @@map("integrations")
}

model Task {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  name            String
  description     String?
  dueDate         DateTime? @map("due_date")
  completed       Boolean   @default(false)
  microsoftTodoId String?   @unique @map("microsoft_todo_id")
  // ... other fields

  @@map("todo_task")
}
```

### 4. Implementation Components

#### A. Microsoft OAuth Service
**File:** `src/services/microsoftOAuthService.js`

**Responsibilities:**
- Generate authorization URL with state parameter (CSRF protection)
- Exchange authorization code for tokens
- Refresh access tokens when expired
- Validate tokens
- Revoke tokens on disconnect

**Key Functions:**
```javascript
getAuthorizationUrl(userId, redirectUri)
  // Returns: { url: string, state: string }

exchangeCodeForTokens(code, redirectUri)
  // Returns: { accessToken, refreshToken, expiresAt }

refreshAccessToken(refreshToken)
  // Returns: { accessToken, expiresAt }

validateToken(accessToken)
  // Returns: boolean

revokeToken(accessToken)
  // Returns: boolean
```

#### B. Microsoft Graph Service
**File:** `src/services/microsoftGraphService.js`

**Responsibilities:**
- Fetch Microsoft To Do lists
- Fetch tasks from specific list
- Transform Microsoft task format to Samaanai format
- Handle API errors and rate limits

**Key Functions:**
```javascript
getTodoLists(accessToken)
  // GET /v1.0/me/todo/lists
  // Returns: [{ id, displayName }]

getTasksFromList(accessToken, listId)
  // GET /v1.0/me/todo/lists/{listId}/tasks
  // Returns: [{ id, title, body, dueDateTime, status, ... }]

transformMicrosoftTask(msTask)
  // Transforms Microsoft task to Samaanai format
  // Returns: {
  //   name: msTask.title,
  //   description: msTask.body?.content || '',
  //   dueDate: msTask.dueDateTime?.dateTime || null,
  //   completed: msTask.status === 'completed',
  //   microsoftTodoId: msTask.id
  // }
```

#### C. Task Sync Service
**File:** `src/services/taskSyncService.js`

**Responsibilities:**
- Orchestrate sync process
- Create vs update decision logic
- Conflict resolution
- Generate sync statistics

**Key Functions:**
```javascript
syncTasksFromMicrosoft(userId, listId = null)
  // Main sync orchestrator
  // 1. Get integration for user
  // 2. Refresh token if needed
  // 3. Fetch tasks from Microsoft
  // 4. For each task, create or update
  // 5. Return statistics

createOrUpdateTask(userId, microsoftTask)
  // Check if task exists by microsoftTodoId
  // If exists: update, else: create
  // Returns: { action: 'created'|'updated'|'skipped', task }

handleSyncConflict(existingTask, newData)
  // Compare timestamps
  // Decide whether to update or skip
  // Returns: boolean (shouldUpdate)

generateSyncReport(results)
  // Aggregate statistics
  // Returns: { created, updated, skipped, errors }
```

#### D. Integration Controller
**File:** `src/controllers/integrationController.js`

**Endpoints:**
```javascript
exports.connectMicrosoft = async (req, res, next) => {
  // Generate OAuth URL
  // Store state in temporary cache/session
  // Return authorization URL
}

exports.handleMicrosoftCallback = async (req, res, next) => {
  // Validate state parameter
  // Exchange code for tokens
  // Store tokens in Integration table
  // Redirect to success page or deep link to app
}

exports.getMicrosoftStatus = async (req, res, next) => {
  // Check if integration exists for user
  // Return connection status
}

exports.disconnectMicrosoft = async (req, res, next) => {
  // Delete integration from database
  // Optionally revoke token with Microsoft
}

exports.syncMicrosoftTasks = async (req, res, next) => {
  // Trigger task sync
  // Return results
}

exports.getMicrosoftLists = async (req, res, next) => {
  // Fetch available To Do lists
  // Return list of lists
}
```

#### E. Integration Routes
**File:** `src/routes/integrations.js`

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const integrationController = require('../controllers/integrationController');

// All routes require authentication except callback
router.post('/microsoft/connect',
  authenticate,
  integrationController.connectMicrosoft
);

router.get('/microsoft/callback',
  integrationController.handleMicrosoftCallback
);

router.get('/microsoft/status',
  authenticate,
  integrationController.getMicrosoftStatus
);

router.delete('/microsoft/disconnect',
  authenticate,
  integrationController.disconnectMicrosoft
);

router.post('/microsoft/sync',
  authenticate,
  integrationController.syncMicrosoftTasks
);

router.get('/microsoft/lists',
  authenticate,
  integrationController.getMicrosoftLists
);

module.exports = router;
```

#### F. Register Routes in Server
**File:** `src/server.js`

```javascript
// Add to imports
const integrationRoutes = require('./routes/integrations');

// Add to route registration
app.use('/api/v1/integrations', integrationRoutes);
```

---

## Security Considerations

### Token Storage
- Access tokens stored in database (consider encryption if highly sensitive)
- Refresh tokens allow long-lived access
- Implement token rotation on refresh
- Clear all tokens on disconnect

### API Security
- All endpoints require JWT authentication (except callback)
- Verify userId matches integration owner
- Rate limit sync endpoints: max 1 sync per minute per user
- Validate OAuth state parameter to prevent CSRF attacks
- Store state temporarily (Redis or in-memory cache with TTL)

### Error Handling
- Don't expose Microsoft API errors directly to client
- Log detailed errors server-side for debugging
- Return user-friendly error messages
- Handle token expiration gracefully (auto-refresh)

---

## Sync Logic Details

### Task Matching Strategy
```
For each Microsoft To Do task:
  1. Query Task table by microsoftTodoId
  2. If found:
     - Compare Microsoft updatedAt vs Samaanai updatedAt
     - If Microsoft is newer: UPDATE
     - If Samaanai is newer: SKIP (preserve local changes)
  3. If not found:
     - CREATE new task
     - Link to user (req.user.id)
     - Set microsoftTodoId for future syncs
```

### Field Mapping
```javascript
// Microsoft To Do → Samaanai
{
  title                       → name
  body.content                → description
  dueDateTime.dateTime        → dueDate
  status === 'completed'      → completed
  id                          → microsoftTodoId
  importance === 'high'       → (future: priority field)
  recurrence                  → (future: reminderType mapping)
}
```

### Conflict Resolution Rules
1. **Never delete** tasks from Samaanai (even if deleted in Microsoft)
2. **Microsoft is source of truth** for synced tasks
3. **Local edits** can be preserved by comparing timestamps
4. **Option to force sync** (override local changes)

### One-Way Sync (Phase 1)
- Direction: Microsoft → Samaanai only
- User manages tasks in Microsoft To Do
- Sync to Samaanai on-demand (manual trigger)
- Future: Scheduled background sync

### Future: Two-Way Sync (Phase 2)
- Detect changes in Samaanai tasks (where microsoftTodoId exists)
- Push updates back to Microsoft Graph API
- Handle conflicts (last-write-wins or merge strategies)
- Requires webhook setup or polling mechanism

---

## Implementation Phases

### Phase 1: Core OAuth & Manual Sync (Week 1)
**Goal:** Users can connect Microsoft account and manually sync tasks

**Tasks:**
1. Set up Microsoft Azure App Registration
   - [ ] Create app in Azure Portal
   - [ ] Configure redirect URIs (staging + production)
   - [ ] Get Client ID and Client Secret
   - [ ] Store credentials in Secret Manager

2. Implement Microsoft OAuth Service
   - [ ] Create `src/services/microsoftOAuthService.js`
   - [ ] Implement authorization URL generation
   - [ ] Implement token exchange
   - [ ] Implement token refresh logic
   - [ ] Add unit tests

3. Implement Microsoft Graph Service
   - [ ] Create `src/services/microsoftGraphService.js`
   - [ ] Implement getTodoLists()
   - [ ] Implement getTasksFromList()
   - [ ] Implement transformMicrosoftTask()
   - [ ] Add error handling for API failures
   - [ ] Add unit tests

4. Implement Task Sync Service
   - [ ] Create `src/services/taskSyncService.js`
   - [ ] Implement syncTasksFromMicrosoft()
   - [ ] Implement createOrUpdateTask()
   - [ ] Implement conflict resolution logic
   - [ ] Add unit tests

5. Implement Integration Controller & Routes
   - [ ] Create `src/controllers/integrationController.js`
   - [ ] Create `src/routes/integrations.js`
   - [ ] Implement all 6 endpoints
   - [ ] Add input validation
   - [ ] Register routes in server.js

6. Manual Testing
   - [ ] Test OAuth flow end-to-end
   - [ ] Test sync with real Microsoft account
   - [ ] Test token refresh
   - [ ] Test disconnect flow
   - [ ] Test error scenarios

**Deliverables:**
- Working OAuth flow
- Manual sync functionality
- All endpoints implemented and tested
- Unit tests for services
- Documentation

### Phase 2: Mobile App Integration & Testing (Week 2)
**Goal:** Add UI in mobile app and comprehensive testing

**Tasks:**
1. Mobile App UI
   - [ ] Add "Integrations" screen in Settings
   - [ ] Add "Connect Microsoft To Do" button
   - [ ] Add "Disconnect" button
   - [ ] Add "Sync Now" button
   - [ ] Show connection status
   - [ ] Show last sync time
   - [ ] Handle OAuth redirect (deep linking)

2. User Feedback
   - [ ] Toast notifications for sync success/failure
   - [ ] Loading indicators during sync
   - [ ] Error messages for common issues
   - [ ] Sync progress indicator

3. Testing
   - [ ] Integration tests for all endpoints
   - [ ] Test with multiple users
   - [ ] Test edge cases (no tasks, large lists, etc.)
   - [ ] Test token expiration handling
   - [ ] Load testing (many tasks)

4. Documentation
   - [ ] API documentation (OpenAPI/Swagger)
   - [ ] User guide (how to connect)
   - [ ] Troubleshooting guide

**Deliverables:**
- Complete mobile app integration
- Comprehensive test suite
- User and developer documentation

### Phase 3: Automation & Enhancements (Week 3 - Optional)
**Goal:** Automatic background sync and advanced features

**Tasks:**
1. Scheduled Sync
   - [ ] Add cron job using `node-cron`
   - [ ] Sync all connected users every 6 hours
   - [ ] Handle failures gracefully
   - [ ] Send notifications on sync errors

2. Sync History
   - [ ] Create SyncLog table (track each sync)
   - [ ] Show sync history to user
   - [ ] Include statistics and errors

3. Advanced Features
   - [ ] Allow user to select which list to sync
   - [ ] Sync preferences (frequency, conflict resolution)
   - [ ] Task filtering (only incomplete tasks, date range)
   - [ ] Bulk operations

**Deliverables:**
- Automated sync functionality
- Sync history tracking
- Enhanced user controls
- Production-ready system

---

## Development Workflow

### Current Branch Structure
```
* feature/microsoft-sync  ← Current development branch
  staging                 ← Testing environment
  main                    ← Production (protected)
```

### Workflow Steps

#### 1. Development Phase (Now)
```bash
# Currently on: feature/microsoft-sync
# Implement all Phase 1 features here
git add .
git commit -m "feat: implement Microsoft To Do OAuth integration"
git push origin feature/microsoft-sync
```

#### 2. Deploy to Staging
```bash
# Merge development branch to staging
git checkout staging
git pull origin staging
git merge feature/microsoft-sync
git push origin staging

# GitHub Actions automatically deploys to:
# https://samaanai-backend-staging-*.us-west1.run.app

# Test thoroughly in staging environment
```

#### 3. Deploy to Production
```bash
# After staging tests pass, create PR to main
gh pr create \
  --base main \
  --head staging \
  --title "feat: Microsoft To Do Integration" \
  --body "## Summary
Microsoft To Do sync integration implementation

## Testing
- ✅ OAuth flow tested in staging
- ✅ Manual sync working correctly
- ✅ Token refresh verified
- ✅ All unit tests passing
- ✅ Integration tests passing

## Deployment
- Requires MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET secrets in production
- No database migrations needed (schema already updated)
- Backward compatible (new feature, doesn't affect existing functionality)

## Rollback Plan
If issues occur, revert by merging previous main commit"

# Wait for PR approval (required by branch protection)
# After approval, merge PR
# GitHub Actions automatically deploys to production
```

### Branch Protection Configuration

**Main Branch (Production):** ✅ Already Protected
- Requires 1 approving review before merge
- Dismisses stale reviews on new commits
- Prevents direct pushes
- Prevents force pushes
- Prevents deletion

**Staging Branch:** Recommendation
```bash
# Add protection to staging branch to prevent accidents
gh api repos/kittureddy2000/Samaanai_apps/branches/staging/protection \
  --method PUT \
  --field required_pull_request_reviews[required_approving_review_count]=0 \
  --field enforce_admins=false \
  --field required_status_checks=null \
  --field restrictions=null
```

---

## Environment Variables

### Required Environment Variables

#### Development/Staging
```bash
# Microsoft OAuth
MICROSOFT_CLIENT_ID=<your-azure-app-client-id>
MICROSOFT_CLIENT_SECRET=<your-azure-app-client-secret>
MICROSOFT_TENANT=common  # or specific tenant ID
MICROSOFT_REDIRECT_URI=https://samaanai-backend-staging-*.us-west1.run.app/api/v1/integrations/microsoft/callback

# Microsoft Graph API
MICROSOFT_GRAPH_API_BASE_URL=https://graph.microsoft.com/v1.0
MICROSOFT_AUTHORITY_URL=https://login.microsoftonline.com
```

#### Production
```bash
# Same variables as staging, but with production URLs
MICROSOFT_REDIRECT_URI=https://samaanai-backend-*.us-west1.run.app/api/v1/integrations/microsoft/callback
```

### Google Cloud Secret Manager Setup

```bash
# Staging secrets
echo "<your-client-id>" | gcloud secrets create MICROSOFT_CLIENT_ID \
  --data-file=- \
  --project=samaanai-stg-1009-124126

echo "<your-client-secret>" | gcloud secrets create MICROSOFT_CLIENT_SECRET \
  --data-file=- \
  --project=samaanai-stg-1009-124126

# Production secrets
echo "<your-client-id>" | gcloud secrets create MICROSOFT_CLIENT_ID \
  --data-file=- \
  --project=samaanai-prod-1009-124126

echo "<your-client-secret>" | gcloud secrets create MICROSOFT_CLIENT_SECRET \
  --data-file=- \
  --project=samaanai-prod-1009-124126
```

### Update Cloud Run Service

Ensure secrets are mounted in `.github/workflows/backend-deploy-*.yml`:

```yaml
env:
  - name: MICROSOFT_CLIENT_ID
    valueFrom:
      secretKeyRef:
        name: MICROSOFT_CLIENT_ID
        key: latest
  - name: MICROSOFT_CLIENT_SECRET
    valueFrom:
      secretKeyRef:
        name: MICROSOFT_CLIENT_SECRET
        key: latest
```

---

## Testing Strategy

### Unit Tests (Jest)
**Files to test:**
- `src/services/microsoftOAuthService.js`
- `src/services/microsoftGraphService.js`
- `src/services/taskSyncService.js`

**Test Cases:**
- OAuth URL generation with state parameter
- Token exchange with valid/invalid codes
- Token refresh with valid/expired tokens
- Microsoft Graph API responses (mocked)
- Task transformation (Microsoft → Samaanai format)
- Sync logic (create vs update decision)
- Conflict resolution scenarios

### Integration Tests
**Test Scenarios:**
1. Complete OAuth flow (mocked Microsoft endpoints)
2. Fetch tasks and sync to database
3. Update existing task during sync
4. Token refresh during sync
5. Error handling (network failures, invalid tokens)
6. Rate limiting enforcement

### Manual Testing Checklist
- [ ] Connect Microsoft account (first time)
- [ ] Verify tokens stored in Integration table
- [ ] Fetch Microsoft To Do lists successfully
- [ ] Sync tasks from "Tasks" list
- [ ] Verify tasks created in Samaanai database
- [ ] Sync again - verify updates work correctly
- [ ] Complete task in Microsoft - sync - verify completion synced
- [ ] Wait for token expiration - sync - verify refresh works
- [ ] Disconnect integration - verify tokens deleted
- [ ] Reconnect - verify can authenticate again
- [ ] Test with empty task list
- [ ] Test with large task list (100+ tasks)
- [ ] Test with tasks that have no due date
- [ ] Test with completed tasks
- [ ] Test error scenarios (invalid token, network failure)

---

## Dependencies

### NPM Packages to Install

```bash
npm install @azure/msal-node axios
```

**Packages:**
- `@azure/msal-node` - Microsoft Authentication Library for Node.js (OAuth2 flow)
- `axios` - HTTP client for Microsoft Graph API calls (already installed via plaid dependency)

**Why these packages:**
- `@azure/msal-node`: Official Microsoft library for OAuth2 authentication, handles token management
- `axios`: Already in use for Plaid integration, will reuse for Microsoft Graph API

---

## Microsoft Azure Setup

### Step 1: Register Application in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to: **Microsoft Entra ID** → **App registrations** → **New registration**
3. Fill in:
   - **Name**: Samaanai Microsoft To Do Integration
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**:
     - Type: Web
     - URL: `https://samaanai-backend-staging-*.us-west1.run.app/api/v1/integrations/microsoft/callback`

### Step 2: Configure API Permissions

1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - `Tasks.ReadWrite` - Read and write user's tasks
   - `offline_access` - Maintain access to data you have given it access to
4. Click **Grant admin consent** (if you have admin rights)

### Step 3: Create Client Secret

1. Go to **Certificates & secrets** → **New client secret**
2. Description: "Samaanai Backend Secret"
3. Expires: 24 months (or never)
4. **Copy the secret value immediately** (won't be shown again)
5. Also note the **Application (client) ID** from Overview page

### Step 4: Add Production Redirect URI

1. Go to **Authentication** → **Add a platform** → **Web**
2. Add production URL: `https://samaanai-backend-*.us-west1.run.app/api/v1/integrations/microsoft/callback`

---

## Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Microsoft API rate limits | Sync failures | Medium | Implement exponential backoff, cache responses, limit sync frequency |
| Token expiration during sync | Incomplete sync | High | Refresh token before sync, retry on 401 errors |
| Large task lists (1000+ items) | Slow sync, timeout | Low | Implement pagination, process in batches, async job queue |
| User modifies task during sync | Data conflict | Medium | Use timestamps for conflict resolution, last-write-wins strategy |
| Microsoft service outage | No sync available | Low | Graceful error handling, queue retries, notify user |
| Malicious OAuth redirect | Security breach | Low | Validate state parameter, whitelist redirect URIs, HTTPS only |
| Token leakage | Unauthorized access | Medium | Encrypt tokens at rest, use HTTPS, implement token rotation |
| Concurrent sync requests | Race conditions | Low | Rate limit to 1 sync per minute per user, use database locks |

---

## Success Metrics

### Phase 1 - Core Implementation
- [ ] OAuth flow completes end-to-end without errors
- [ ] Tokens stored correctly in Integration table
- [ ] Tokens refresh automatically before expiration
- [ ] Manual sync creates new tasks
- [ ] Manual sync updates existing tasks
- [ ] Sync statistics returned accurately
- [ ] All unit tests passing (>90% coverage)
- [ ] No security vulnerabilities (npm audit, code review)

### Phase 2 - Integration & Testing
- [ ] Mobile app can initiate OAuth flow
- [ ] Deep linking redirects user back to app
- [ ] User sees connection status clearly
- [ ] Sync button triggers sync and shows results
- [ ] Error messages are user-friendly
- [ ] Integration tests passing
- [ ] Tested with 5+ real users in staging

### Phase 3 - Automation (Optional)
- [ ] Scheduled sync runs every 6 hours
- [ ] Sync history tracked in database
- [ ] Users notified of sync failures
- [ ] Advanced preferences working (list selection, filters)
- [ ] Production deployment successful
- [ ] Monitoring dashboards showing metrics

---

## Timeline Estimate

| Phase | Duration | Effort (hours) |
|-------|----------|----------------|
| Azure setup & secrets | 2 hours | 2 |
| Phase 1: OAuth service | 8 hours | 8 |
| Phase 1: Graph service | 6 hours | 6 |
| Phase 1: Sync service | 8 hours | 8 |
| Phase 1: Controller & routes | 6 hours | 6 |
| Phase 1: Unit tests | 8 hours | 8 |
| Phase 1: Manual testing | 4 hours | 4 |
| **Phase 1 Total** | **~5 days** | **42 hours** |
| | | |
| Phase 2: Mobile UI | 12 hours | 12 |
| Phase 2: Integration tests | 8 hours | 8 |
| Phase 2: Documentation | 4 hours | 4 |
| Phase 2: Testing & fixes | 8 hours | 8 |
| **Phase 2 Total** | **~4 days** | **32 hours** |
| | | |
| Phase 3: Scheduled sync | 6 hours | 6 |
| Phase 3: Sync history | 4 hours | 4 |
| Phase 3: Advanced features | 6 hours | 6 |
| Phase 3: Production deployment | 4 hours | 4 |
| **Phase 3 Total** | **~3 days** | **20 hours** |
| | | |
| **Grand Total** | **~12 days** | **94 hours** |

**Note:** Timeline assumes focused development. Actual calendar time may vary based on availability and priorities.

---

## Next Steps

### Immediate Actions

1. **Review This Plan** ✋
   - Confirm approach aligns with your vision
   - Answer questions below
   - Approve to proceed with implementation

2. **Azure App Registration** (requires your Microsoft account)
   - Create app in Azure Portal
   - Configure permissions and get credentials
   - Share Client ID and Secret with me

3. **Begin Implementation**
   - Start with Phase 1 (OAuth + Sync services)
   - Test incrementally as each component is built
   - Deploy to staging when Phase 1 complete

4. **Iterative Testing**
   - Test each service as it's implemented
   - Fix issues immediately
   - Maintain test coverage throughout

5. **Staging Deployment**
   - Merge to staging branch
   - Test with real Microsoft account
   - Validate sync functionality

6. **Production Deployment**
   - Create PR to main after successful staging tests
   - Get PR approved
   - Deploy to production

---

## Questions to Confirm Before Implementation

Please answer these questions to ensure we're aligned:

1. **Sync Direction**
   One-way sync (Microsoft → Samaanai) is sufficient for Phase 1, correct?
   - [ X ] Yes, one-way is fine
   - [ ] No, need two-way sync from start

2. **Sync Trigger**
   Manual sync (user clicks button) is acceptable for Phase 1?
   - [X ] Yes, manual is fine
   - [ ] No, need automatic sync from start

3. **List Selection**
   Should users be able to choose which Microsoft list to sync?
   - [ ] Yes, let them choose
   - [ X] No, always sync "Tasks" list only
   - [ ] Sync all lists

4. **Existing Tasks**
   What should happen to existing Samaanai tasks when user connects Microsoft?
   - [X ] Keep both separate (no conflicts)
   - [ ] Merge if possible
   - [ ] User chooses

5. **Conflict Resolution**
   When a task exists in both places with different data:
   - [ X] Microsoft always wins (overwrite Samaanai)
   - [ ] Compare timestamps (newer wins)
   - [ ] Ask user each time

6. **Mobile App Changes**
   Are you comfortable with UI changes needed in mobile app?
   - [X ] Yes, proceed with UI changes
   - [ ] No, backend only for now

7. **Azure Account**
   Do you have access to create Azure app registrations?
   - [X ] Yes, I can create the app
   - [ ] No, need help with this

---

## Approval

**Status:** Awaiting your approval and answers to questions above

Once approved, I'll begin implementation starting with Phase 1.

**Estimated completion:** Phase 1 in ~1 week of focused development

---

**Last Updated:** 2025-11-20
**Document Version:** 2.0 (Native integration approach)
