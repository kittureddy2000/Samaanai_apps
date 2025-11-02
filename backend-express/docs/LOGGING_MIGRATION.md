# Migrating to Structured Logging

## Why Structured Logging?

**Current Issues:**
- `console.log()` produces unstructured text
- Hard to search/filter in Cloud Logging
- No request IDs or correlation
- Missing context (user, request path)
- No log levels (everything is "info")

**Benefits of Pino:**
- ✅ Structured JSON logs
- ✅ Request IDs for tracing
- ✅ Automatic HTTP logging
- ✅ Log levels (debug, info, warn, error)
- ✅ Performance (10x faster than console.log)
- ✅ Pretty printing in development

## Migration Guide

### Step 1: Replace console.log with logger

**Before:**
\`\`\`javascript
console.log('User logged in:', user.email);
console.error('Database error:', error);
\`\`\`

**After:**
\`\`\`javascript
const logger = require('../config/logger');

logger.info({ userId: user.id, email: user.email }, 'User logged in');
logger.error({ err: error }, 'Database error');
\`\`\`

### Step 2: Use Child Loggers for Context

\`\`\`javascript
// In controllers, create a child logger with context
const log = logger.child({ userId: req.user.id, requestId: req.id });

log.info('Fetching user profile');
log.warn({ field: 'email' }, 'Invalid email format');
log.error({ err: error }, 'Failed to update profile');
\`\`\`

### Step 3: HTTP Request Logging

Already configured in `server.js`:

\`\`\`javascript
const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);
\`\`\`

This automatically logs:
- Request method, path, params, query
- Response status, timing
- User ID (if authenticated)
- IP address

### Step 4: Log Levels Guide

\`\`\`javascript
// TRACE (10): Very detailed debugging (disabled in prod)
logger.trace({ data: complexObject }, 'Processing data');

// DEBUG (20): Debugging information (disabled in prod)
logger.debug({ sql: query }, 'Executing database query');

// INFO (30): Normal operations
logger.info({ userId, action: 'login' }, 'User logged in');

// WARN (40): Unexpected but handled
logger.warn({ remainingRetries: 2 }, 'API call failed, retrying');

// ERROR (50): Error conditions
logger.error({ err: error, userId }, 'Failed to process payment');

// FATAL (60): App-crashing errors
logger.fatal({ err: error }, 'Database connection lost');
\`\`\`

### Step 5: Migration Examples

**Auth Controller:**

\`\`\`javascript
// Before
console.log('Login attempt for:', email);
console.error('Login failed:', error);

// After
const logger = require('../config/logger');

exports.login = async (req, res) => {
  const log = logger.child({ requestId: req.id });
  const { email } = req.body;

  log.info({ email }, 'Login attempt');

  try {
    const user = await authenticateUser(email, password);
    log.info({ userId: user.id }, 'Login successful');
    return res.json({ user, token });
  } catch (error) {
    log.error({ err: error, email }, 'Login failed');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
};
\`\`\`

**Scheduler Service:**

\`\`\`javascript
// Before
console.log('Starting weekly report generation...');
console.log(\`Found \${users.length} users with weekly reports enabled\`);
console.error('Error sending weekly report to user', userId, error);

// After
const logger = require('../config/logger');

const sendWeeklyReports = async () => {
  const log = logger.child({ task: 'weekly-reports' });

  log.info('Starting weekly report generation');

  const users = await getUsers();
  log.info({ userCount: users.length }, 'Found users with weekly reports enabled');

  for (const user of users) {
    try {
      await sendReport(user);
      log.info({ userId: user.id }, 'Weekly report sent');
    } catch (error) {
      log.error({ err: error, userId: user.id }, 'Failed to send weekly report');
    }
  }

  log.info({ successCount, failCount }, 'Weekly report generation completed');
};
\`\`\`

## Querying Logs in Cloud Logging

### Find All Errors

\`\`\`bash
gcloud logging read \\
  'severity>=ERROR AND jsonPayload.service="samaanai-backend"' \\
  --limit=50 \\
  --format=json
\`\`\`

### Find Logs for Specific User

\`\`\`bash
gcloud logging read \\
  'jsonPayload.userId="abc-123"' \\
  --limit=100
\`\`\`

### Find Slow Requests (>1s)

\`\`\`bash
gcloud logging read \\
  'jsonPayload.responseTime>1000' \\
  --limit=50
\`\`\`

### Trace a Request by ID

\`\`\`bash
gcloud logging read \\
  'jsonPayload.requestId="req-xyz"' \\
  --format=json
\`\`\`

## Best Practices

1. **Always Include Context:**
   \`\`\`javascript
   // Good
   logger.info({ userId, action: 'update_profile' }, 'Profile updated');

   // Bad
   logger.info('Profile updated');
   \`\`\`

2. **Use Child Loggers:**
   \`\`\`javascript
   // In controllers/services
   const log = logger.child({ module: 'auth', requestId: req.id });
   \`\`\`

3. **Never Log Sensitive Data:**
   \`\`\`javascript
   // Bad
   logger.info({ password, creditCard }, 'User registered');

   // Good (redaction configured in logger.js)
   logger.info({ userId, email }, 'User registered');
   \`\`\`

4. **Include Error Stack:**
   \`\`\`javascript
   logger.error({ err: error }, 'Operation failed');
   // Pino automatically includes error.message and error.stack
   \`\`\`

5. **Use Appropriate Levels:**
   - Don't use `error` for expected validation failures
   - Don't use `info` for debugging output
   - Don't use `debug` for important business events

## Performance

Pino is ~10x faster than console.log:

\`\`\`
console.log:  ~50,000 ops/sec
pino:         ~500,000 ops/sec
\`\`\`

Safe to use in hot paths without performance concerns.

## Development Experience

In development, logs are pretty-printed:

\`\`\`
[14:30:45] INFO (auth): User logged in
    userId: "abc-123"
    email: "user@example.com"

[14:30:46] ERROR (payment): Payment processing failed
    userId: "abc-123"
    amount: 99.99
    error: "Insufficient funds"
    stack: "Error: Insufficient funds\\n    at ..."
\`\`\`

In production, logs are JSON:

\`\`\`json
{
  "level": 30,
  "time": 1699123456789,
  "service": "samaanai-backend",
  "env": "production",
  "userId": "abc-123",
  "email": "user@example.com",
  "msg": "User logged in"
}
\`\`\`

## Gradual Migration

You don't need to migrate all at once:

1. Week 1: Add logger, start using in new code
2. Week 2: Migrate auth & payment critical paths
3. Week 3: Migrate controllers
4. Week 4: Migrate services
5. Week 5: Remove remaining console.log

## Monitoring Dashboard

Create a Cloud Logging dashboard to monitor:

- Error rate (count of severity>=ERROR)
- P95 response time (95th percentile responseTime)
- Request volume by endpoint
- Failed login attempts
- Payment errors
