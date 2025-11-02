# Migrating Cron Jobs to Cloud Scheduler

## Problem with Current Implementation

The current scheduler uses `node-cron` running inside the Express app (`src/services/schedulerService.js`). This creates several issues on Cloud Run:

1. **Multiple Executions**: With autoscaling, multiple instances can run the same job simultaneously
2. **Missed Jobs**: If no instances are running (min=0), jobs won't execute
3. **Resource Waste**: Keeping instances alive just for cron jobs is inefficient
4. **No Retry Logic**: If a job fails, there's no automatic retry

## Recommended Solution: Google Cloud Scheduler

Cloud Scheduler triggers jobs by making HTTP requests to your backend endpoints. This is the proper way to run scheduled tasks on serverless platforms.

### Architecture

```
Cloud Scheduler → HTTP POST → /api/v1/cron/weekly-reports
                            → /api/v1/cron/task-reminders
                            → /api/v1/cron/calorie-reminders
```

## Implementation Steps

### Step 1: Create Cron HTTP Endpoints

Create `src/routes/cron.js`:

\`\`\`javascript
const express = require('express');
const router = express.Router();
const { sendWeeklyReports, sendTaskReminders, sendCalorieReminders } = require('../services/schedulerService');

// Middleware to verify Cloud Scheduler requests
const verifyCloudScheduler = (req, res, next) => {
  // Verify the request is from Cloud Scheduler
  const authHeader = req.headers['authorization'];
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }

  if (authHeader !== \`Bearer \${expectedToken}\`) {
    console.warn('Unauthorized cron request from', req.ip);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// All cron endpoints require verification
router.use(verifyCloudScheduler);

// Weekly reports - runs every Monday at 8:00 AM
router.post('/weekly-reports', async (req, res) => {
  try {
    await sendWeeklyReports();
    res.json({ success: true, message: 'Weekly reports sent' });
  } catch (error) {
    console.error('Weekly reports cron error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Task reminders - runs twice daily
router.post('/task-reminders', async (req, res) => {
  try {
    await sendTaskReminders();
    res.json({ success: true, message: 'Task reminders sent' });
  } catch (error) {
    console.error('Task reminders cron error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calorie reminders - runs twice daily
router.post('/calorie-reminders', async (req, res) => {
  try {
    await sendCalorieReminders();
    res.json({ success: true, message: 'Calorie reminders sent' });
  } catch (error) {
    console.error('Calorie reminders cron error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
\`\`\`

Add to `src/server.js`:

\`\`\`javascript
const cronRoutes = require('./routes/cron');
app.use('/api/v1/cron', cronRoutes);
\`\`\`

### Step 2: Remove In-Process Cron

In `src/server.js`, remove or comment out:

\`\`\`javascript
// DEPRECATED: Moving to Cloud Scheduler
// const { initializeScheduler } = require('./services/schedulerService');
// initializeScheduler();
\`\`\`

### Step 3: Set Up Cloud Scheduler

Generate a secure token:

\`\`\`bash
openssl rand -base64 32
\`\`\`

Add to Secret Manager:

\`\`\`bash
# Staging
echo -n "your-secure-random-token" | gcloud secrets create CRON_SECRET \\
  --project=samaanai-stg-1009-124126 \\
  --data-file=-

# Production
echo -n "different-secure-random-token" | gcloud secrets create CRON_SECRET \\
  --project=samaanai-prod-1009-124126 \\
  --data-file=-
\`\`\`

Update Cloud Run service to include the secret:

\`\`\`bash
gcloud run deploy samaanai-backend-staging \\
  --set-secrets CRON_SECRET=CRON_SECRET:latest \\
  # ... other flags
\`\`\`

### Step 4: Create Scheduler Jobs

Create weekly reports job (Monday 8 AM PST):

\`\`\`bash
gcloud scheduler jobs create http weekly-reports-staging \\
  --schedule="0 8 * * 1" \\
  --time-zone="America/Los_Angeles" \\
  --uri="https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/cron/weekly-reports" \\
  --http-method=POST \\
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \\
  --max-retry-attempts=3 \\
  --max-backoff=1h \\
  --project=samaanai-stg-1009-124126
\`\`\`

Create task reminders (6:30 AM and 8 PM PST):

\`\`\`bash
# Morning reminders
gcloud scheduler jobs create http task-reminders-morning-staging \\
  --schedule="30 6 * * *" \\
  --time-zone="America/Los_Angeles" \\
  --uri="https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/cron/task-reminders" \\
  --http-method=POST \\
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \\
  --max-retry-attempts=3 \\
  --project=samaanai-stg-1009-124126

# Evening reminders
gcloud scheduler jobs create http task-reminders-evening-staging \\
  --schedule="0 20 * * *" \\
  --time-zone="America/Los_Angeles" \\
  --uri="https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/cron/task-reminders" \\
  --http-method=POST \\
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \\
  --max-retry-attempts=3 \\
  --project=samaanai-stg-1009-124126
\`\`\`

Create calorie reminders (6:30 AM and 8 PM PST):

\`\`\`bash
# Morning reminders
gcloud scheduler jobs create http calorie-reminders-morning-staging \\
  --schedule="30 6 * * *" \\
  --time-zone="America/Los_Angeles" \\
  --uri="https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/cron/calorie-reminders" \\
  --http-method=POST \\
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \\
  --max-retry-attempts=3 \\
  --project=samaanai-stg-1009-124126

# Evening reminders
gcloud scheduler jobs create http calorie-reminders-evening-staging \\
  --schedule="0 20 * * *" \\
  --time-zone="America/Los_Angeles" \\
  --uri="https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/cron/calorie-reminders" \\
  --http-method=POST \\
  --headers="Authorization=Bearer YOUR_CRON_SECRET" \\
  --max-retry-attempts=3 \\
  --project=samaanai-stg-1009-124126
\`\`\`

### Step 5: Testing

Test manually:

\`\`\`bash
curl -X POST \\
  https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app/api/v1/cron/weekly-reports \\
  -H "Authorization: Bearer YOUR_CRON_SECRET"
\`\`\`

List jobs:

\`\`\`bash
gcloud scheduler jobs list --project=samaanai-stg-1009-124126
\`\`\`

View logs:

\`\`\`bash
gcloud logging read "resource.type=cloud_scheduler_job" \\
  --project=samaanai-stg-1009-124126 \\
  --limit=50
\`\`\`

## Benefits

✅ **Reliable**: Jobs run exactly once, even with autoscaling
✅ **Visible**: Logs in Cloud Console
✅ **Retry Logic**: Automatic retries on failure
✅ **Cost Efficient**: No need to keep instances alive
✅ **Scalable**: Independent of backend instances

## Rollout Plan

1. ✅ **Week 1**: Deploy cron HTTP endpoints to staging (keep node-cron running)
2. **Week 2**: Create Cloud Scheduler jobs, monitor both systems in parallel
3. **Week 3**: Disable node-cron in staging, verify Cloud Scheduler works
4. **Week 4**: Deploy to production

## Security Notes

- **CRON_SECRET** must be strong (use `openssl rand -base64 32`)
- Store in Secret Manager, not environment variables
- Different secrets for staging/production
- Consider using Cloud Tasks for even better reliability
