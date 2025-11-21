# Redis Rate Limiter for Cloud Run

## Problem with Current In-Memory Limiter

The current rate limiter (`src/middleware/rateLimiter.js`) uses in-memory storage. This creates issues with Cloud Run autoscaling:

1. **Per-Instance Limits**: Each Cloud Run instance has its own counter. A user can make 1000 requests to instance A and another 1000 to instance B.
2. **Lost State**: When instances scale down, rate limit state is lost.
3. **No Global View**: Can't enforce organization-wide rate limits.

## Solution: Memorystore for Redis

Google Cloud's Memorystore (managed Redis) provides shared state across all Cloud Run instances.

### Architecture

```
Cloud Run Instance 1 ──┐
Cloud Run Instance 2 ──┼──> Memorystore (Redis) ──> Shared Rate Limit State
Cloud Run Instance 3 ──┘
```

## Implementation Guide

### Step 1: Create Memorystore Instance

Create a Redis instance in the same region as your Cloud Run service:

\`\`\`bash
# Create VPC connector (required for Cloud Run to access Memorystore)
gcloud compute networks vpc-access connectors create samaanai-connector \\
  --region= \\
  --network=default \\
  --range=10.8.0.0/28 \\
  --project=samaanai-stg-1009-124126

# Create Memorystore Redis instance (1GB, Basic tier)
gcloud redis instances create samaanai-redis-staging \\
  --size=1 \\
  --region= \\
  --redis-version=redis_7_0 \\
  --tier=basic \\
  --project=samaanai-stg-1009-124126

# Get the Redis host IP
gcloud redis instances describe samaanai-redis-staging \\
  --region= \\
  --format="value(host)" \\
  --project=samaanai-stg-1009-124126
\`\`\`

**Cost**: Basic tier 1GB ~$50/month

### Step 2: Update Cloud Run Service

Add VPC connector to Cloud Run:

\`\`\`bash
gcloud run services update samaanai-backend-staging \\
  --vpc-connector=samaanai-connector \\
  --vpc-egress=private-ranges-only \\
  --region= \\
  --project=samaanai-stg-1009-124126
\`\`\`

Add Redis host to environment:

\`\`\`bash
# Add to Secret Manager
echo -n "10.x.x.x:6379" | gcloud secrets create REDIS_URL \\
  --project=samaanai-stg-1009-124126 \\
  --data-file=-

# Update Cloud Run to use the secret
gcloud run services update samaanai-backend-staging \\
  --set-secrets REDIS_URL=REDIS_URL:latest \\
  --region= \\
  --project=samaanai-stg-1009-124126
\`\`\`

### Step 3: Update Rate Limiter Code

Replace `src/middleware/rateLimiter.js` with Redis-backed version:

\`\`\`javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');

// Create Redis client
let redisClient = null;

const getRedisClient = async () => {
  if (redisClient) return redisClient;

  // Only use Redis in production/staging
  if (!process.env.REDIS_URL || process.env.NODE_ENV === 'development') {
    return null;
  }

  const client = createClient({
    url: \`redis://\${process.env.REDIS_URL}\`,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis connection failed after 10 retries');
          return new Error('Redis connection failed');
        }
        return retries * 100; // Exponential backoff
      }
    }
  });

  client.on('error', (err) => console.error('Redis Client Error', err));
  client.on('connect', () => console.log('✅ Redis connected'));
  client.on('reconnecting', () => console.log('⚠️  Redis reconnecting...'));

  await client.connect();
  redisClient = client;
  return client;
};

// Global rate limiter
const createRateLimiter = async () => {
  const client = await getRedisClient();

  const config = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: {
      error: 'Too many requests',
      retryAfter: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
  };

  // Use Redis store if available, otherwise in-memory
  if (client) {
    config.store = new RedisStore({
      client: client,
      prefix: 'rl:global:',
    });
    console.log('✅ Rate limiter using Redis store');
  } else {
    console.warn('⚠️  Rate limiter using in-memory store (dev mode)');
  }

  return rateLimit(config);
};

// Auth rate limiter (stricter)
const createAuthLimiter = async () => {
  const client = await getRedisClient();

  const config = {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
      error: 'Too many login attempts. Please try again later.',
      retryAfter: 'Please wait 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  };

  if (client) {
    config.store = new RedisStore({
      client: client,
      prefix: 'rl:auth:',
    });
  }

  return rateLimit(config);
};

module.exports = {
  createRateLimiter,
  createAuthLimiter,
  getRedisClient
};
\`\`\`

### Step 4: Update server.js

\`\`\`javascript
// In server.js
const { createRateLimiter } = require('./middleware/rateLimiter');

// Initialize rate limiter (async)
let rateLimiter;
createRateLimiter().then(limiter => {
  rateLimiter = limiter;
  app.use(rateLimiter);
});
\`\`\`

### Step 5: Update auth routes

\`\`\`javascript
// In routes/auth.js
const { createAuthLimiter } = require('../middleware/rateLimiter');

let authLimiter;
createAuthLimiter().then(limiter => {
  authLimiter = limiter;
});

router.post('/login',
  (req, res, next) => authLimiter ? authLimiter(req, res, next) : next(),
  loginValidation,
  authController.login
);
\`\`\`

## Alternative: Upstash Redis (Serverless)

For a simpler, serverless Redis option:

1. Sign up at [upstash.com](https://upstash.com)
2. Create a Redis database (free tier available)
3. Get REST API URL and token
4. Use Upstash SDK (no VPC needed)

\`\`\`javascript
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
\`\`\`

**Pros**: No VPC setup, serverless, free tier
**Cons**: REST API (slightly higher latency than native Redis)

## Cost Comparison

| Solution | Cost | Setup Complexity |
|----------|------|------------------|
| In-Memory (current) | $0 | Easy |
| Memorystore Basic 1GB | ~$50/month | Medium (VPC required) |
| Upstash Free Tier | $0 | Easy |
| Upstash Pro | ~$10/month | Easy |

## Recommendation

**For Staging**: Keep in-memory for now, it's acceptable for low traffic
**For Production**: Use Upstash (easier setup) or Memorystore (if you need low latency)

## Testing

Test rate limiting:

\`\`\`bash
# Spam requests to test rate limit
for i in {1..15}; do
  curl -X POST https://your-api.run.app/api/v1/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"email":"test@test.com","password":"test123"}' \\
    && echo " - Request $i"
done
\`\`\`

After 10 requests, you should see 429 errors.

## Monitoring

Add logs to track rate limit hits:

\`\`\`javascript
// In rate limiter config
handler: (req, res) => {
  console.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    user: req.user?.id
  });

  res.status(429).json({
    error: 'Too many requests',
    retryAfter: req.rateLimit.resetTime
  });
}
\`\`\`

View rate limit logs:

\`\`\`bash
gcloud logging read "jsonPayload.message=~'Rate limit exceeded'" \\
  --project=samaanai-stg-1009-124126 \\
  --limit=50
\`\`\`
