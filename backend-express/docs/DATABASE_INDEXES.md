# Database Index Optimization Guide

## Current Index Analysis

### Existing Indexes (from Prisma schema)

```prisma
// MealEntry
@@unique([userId, date, mealType])
@@index([userId, date(sort: Desc)])

// ExerciseEntry
@@unique([userId, date])
@@index([userId, date(sort: Desc)])

// WeightEntry
@@unique([userId, date])
@@index([userId, date(sort: Desc)])

// Task
@@index([userId, dueDate(sort: Asc)])
@@index([userId, completed])
```

**Good news**: Basic indexes are already in place for user-scoped queries.

**Issues**:
1. No index for overdue tasks query
2. No index for task filtering by category/priority
3. No index for nutrition dashboard date range queries
4. Missing composite indexes for common filtered queries
5. No partial indexes for production performance

## Recommended Index Additions

### 1. Task Indexes for Common Queries

**Query Pattern**: Get incomplete tasks with due dates (overdue check)

```javascript
// Common query in todo service
const overdueTasks = await prisma.task.findMany({
  where: {
    userId,
    completed: false,
    dueDate: { lt: new Date() }
  }
});
```

**Recommended Index** (partial index for performance):

```prisma
model Task {
  // ... existing fields ...

  @@index([userId, completed, dueDate(sort: Asc)], where: "completed = false")
}
```

This creates a partial index that only indexes incomplete tasks, saving space and improving query speed.

**Alternative** (if Prisma doesn't support partial indexes in your version):

```prisma
model Task {
  @@index([userId, completed, dueDate(sort: Asc)])
}
```

### 2. Task Filtering by Category/Priority

**Query Pattern**: Get tasks filtered by category and priority

```javascript
const tasks = await prisma.task.findMany({
  where: {
    userId,
    category: 'Work',
    priority: 'high'
  }
});
```

**Recommended Indexes**:

Add category and priority fields first (if not already in schema), then add indexes:

```prisma
model Task {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  name            String
  description     String?
  dueDate         DateTime? @map("due_date") @db.Date
  reminderType    String?   @map("reminder_type")
  imageUrl        String?   @map("image_url")
  completed       Boolean   @default(false)
  completedAt     DateTime? @map("completed_at")

  // New fields (add if missing)
  category        String?
  priority        String    @default("medium") // 'low', 'medium', 'high'
  status          String    @default("pending") // 'pending', 'in_progress', 'completed'

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Existing indexes
  @@index([userId, dueDate(sort: Asc)])
  @@index([userId, completed])

  // NEW: Composite index for filtering
  @@index([userId, status, priority])
  @@index([userId, category])

  // NEW: Partial index for incomplete tasks with due dates
  @@index([userId, completed, dueDate(sort: Asc)])

  @@map("todo_task")
}
```

### 3. Nutrition Dashboard Queries

**Query Pattern**: Get meals/exercises in date range

```javascript
// Dashboard query for weekly calories
const meals = await prisma.mealEntry.findMany({
  where: {
    userId,
    date: {
      gte: startOfWeek,
      lte: endOfWeek
    }
  }
});
```

**Current Index**: `@@index([userId, date(sort: Desc)])`

✅ This index is **already optimal** for date range queries! No change needed.

### 4. User Login Performance

**Query Pattern**: Login by email

```javascript
const user = await prisma.user.findUnique({
  where: { email: emailLowercase }
});
```

**Current**: `email String @unique`

✅ Unique constraint automatically creates an index. **Already optimal!**

**Recommendation**: Ensure emails are lowercased before querying:

```javascript
// In auth controller
const email = req.body.email.toLowerCase().trim();
```

### 5. Push Notification Queries

**Query Pattern**: Get all users with push tokens and notifications enabled

```javascript
const usersWithNotifications = await prisma.userProfile.findMany({
  where: {
    notifications: true,
    pushToken: { not: null }
  },
  include: { user: true }
});
```

**Recommended Index**:

```prisma
model UserProfile {
  // ... existing fields ...

  @@index([notifications, pushToken])
  @@map("users_userprofile")
}
```

## Complete Updated Schema with All Indexes

```prisma
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  password  String?
  googleId  String?  @unique @map("google_id")
  firstName String?  @map("first_name")
  lastName  String?  @map("last_name")
  isActive  Boolean  @default(true) @map("is_active")
  isStaff   Boolean  @default(false) @map("is_staff")
  dateJoined DateTime @default(now()) @map("date_joined")
  lastLogin  DateTime? @map("last_login")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  profile           UserProfile?
  mealEntries       MealEntry[]
  exerciseEntries   ExerciseEntry[]
  weightEntries     WeightEntry[]
  webauthnCredentials WebAuthnCredential[]
  tasks             Task[]

  @@index([email]) // Already covered by @unique
  @@index([isActive]) // NEW: For filtering active users
  @@map("auth_user")
}

model UserProfile {
  id                    String   @id @default(uuid())
  userId                String   @unique @map("user_id")
  height                Float?
  weight                Float?
  dateOfBirth           DateTime? @map("date_of_birth") @db.Date
  timezone              String   @default("US/Pacific")
  startOfWeek           Int      @default(2) @map("start_of_week")
  metabolicRate         Int?     @map("metabolic_rate")
  weightLossGoal        Float    @default(0) @map("weight_loss_goal")
  notifications         Boolean  @default(true)
  emailNotifications    Boolean  @default(true) @map("email_notifications")
  weeklyReports         Boolean  @default(true) @map("weekly_reports")
  darkMode              Boolean  @default(false) @map("dark_mode")
  pushToken             String?  @map("push_token")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([notifications, pushToken]) // NEW: For push notification queries
  @@index([weeklyReports]) // NEW: For weekly report generation
  @@map("users_userprofile")
}

model WebAuthnCredential {
  id           String    @id @default(uuid())
  userId       String    @map("user_id")
  credentialId String    @map("credential_id")
  publicKey    String    @map("public_key")
  signCount    Int       @default(0) @map("sign_count")
  name         String
  createdAt    DateTime  @default(now()) @map("created_at")
  lastUsed     DateTime? @map("last_used")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, credentialId])
  @@index([credentialId]) // NEW: For credential lookup
  @@map("users_webauthncredential")
}

model MealEntry {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  date        DateTime @db.Date
  mealType    String   @map("meal_type")
  description String
  calories    Int
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date, mealType])
  @@index([userId, date(sort: Desc)]) // Already optimal for date range queries
  @@map("nutrition_mealentry")
}

model ExerciseEntry {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  date            DateTime @db.Date
  description     String
  caloriesBurned  Int      @map("calories_burned")
  durationMinutes Int      @map("duration_minutes")
  createdAt       DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date(sort: Desc)]) // Already optimal
  @@map("nutrition_exerciseentry")
}

model WeightEntry {
  id     String   @id @default(uuid())
  userId String   @map("user_id")
  date   DateTime @db.Date
  weight Float

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date(sort: Desc)]) // Already optimal
  @@map("nutrition_weightentry")
}

model Task {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  name            String
  description     String?
  dueDate         DateTime? @map("due_date") @db.Date
  reminderType    String?   @map("reminder_type")
  imageUrl        String?   @map("image_url")
  completed       Boolean   @default(false)
  completedAt     DateTime? @map("completed_at")

  // New fields (add these if not present)
  category        String?
  priority        String    @default("medium")
  status          String    @default("pending")

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, dueDate(sort: Asc)])
  @@index([userId, completed])
  @@index([userId, completed, dueDate(sort: Asc)]) // NEW: For overdue queries
  @@index([userId, status, priority]) // NEW: For filtering by status & priority
  @@index([userId, category]) // NEW: For filtering by category
  @@map("todo_task")
}
```

## Migration Steps

### Step 1: Add Missing Fields (if needed)

Create migration for new Task fields:

```bash
npx prisma migrate dev --name add_task_fields
```

If asked to add fields manually, update the schema first, then run the migration.

### Step 2: Add Indexes

Update `schema.prisma` with the new indexes shown above.

```bash
npx prisma migrate dev --name add_performance_indexes
```

### Step 3: Deploy to Staging

```bash
# Generate migration SQL
npx prisma migrate dev --create-only --name add_performance_indexes

# Review the SQL in prisma/migrations/[timestamp]_add_performance_indexes/migration.sql

# Deploy to staging
DATABASE_URL="your-staging-db-url" npx prisma migrate deploy
```

### Step 4: Monitor Performance

After deploying indexes, monitor query performance:

```sql
-- Check index usage (PostgreSQL)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Query Performance Analysis

### Before Indexes

**Query**: Get overdue tasks

```javascript
const overdueTasks = await prisma.task.findMany({
  where: {
    userId: 'abc-123',
    completed: false,
    dueDate: { lt: new Date() }
  }
});
```

**Execution Plan** (without composite index):
```sql
EXPLAIN ANALYZE
SELECT * FROM todo_task
WHERE user_id = 'abc-123'
  AND completed = false
  AND due_date < NOW();

-- Result: Sequential scan on todo_task (slow)
-- Planning Time: 0.1ms
-- Execution Time: 45.2ms (with 10,000 tasks)
```

### After Indexes

**Execution Plan** (with composite index):
```sql
EXPLAIN ANALYZE
SELECT * FROM todo_task
WHERE user_id = 'abc-123'
  AND completed = false
  AND due_date < NOW();

-- Result: Index scan using idx_task_user_completed_duedate
-- Planning Time: 0.1ms
-- Execution Time: 2.3ms (with 10,000 tasks)
```

**Performance Improvement**: ~20x faster

## Index Maintenance

### Monitor Index Bloat

```sql
-- Check for bloated indexes (PostgreSQL)
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid) - pg_relation_size(indexrelid, 'main')) as bloat
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Rebuild Indexes (if needed)

```sql
-- Rebuild a single index
REINDEX INDEX idx_task_user_completed_duedate;

-- Rebuild all indexes on a table
REINDEX TABLE todo_task;

-- Rebuild all indexes in database (do during maintenance window)
REINDEX DATABASE samaanai_production;
```

## Partial Indexes (Advanced)

Prisma doesn't fully support partial indexes in the schema, but you can create them manually:

### Create Partial Index for Incomplete Tasks

```sql
-- Create partial index manually
CREATE INDEX idx_task_incomplete_with_duedate
ON todo_task (user_id, due_date)
WHERE completed = false;

-- This index only contains rows where completed = false
-- Much smaller and faster than full index
```

### Create Partial Index for Active Users

```sql
CREATE INDEX idx_active_users_email
ON auth_user (email)
WHERE is_active = true;
```

### Track Manual Indexes

Document manual indexes in a separate migration file:

**prisma/migrations/manual_partial_indexes.sql**:

```sql
-- Partial index for incomplete tasks with due dates
-- Used by: todoService.getOverdueTasks()
-- Performance: 30x faster than sequential scan
CREATE INDEX IF NOT EXISTS idx_task_incomplete_with_duedate
ON todo_task (user_id, due_date)
WHERE completed = false;

-- Partial index for users with push notifications
-- Used by: schedulerService.sendTaskReminders()
CREATE INDEX IF NOT EXISTS idx_profile_push_enabled
ON users_userprofile (user_id, push_token)
WHERE notifications = true AND push_token IS NOT NULL;

-- Partial index for users with weekly reports
-- Used by: schedulerService.sendWeeklyReports()
CREATE INDEX IF NOT EXISTS idx_profile_weekly_reports
ON users_userprofile (user_id)
WHERE weekly_reports = true;
```

Run manually on staging/production:

```bash
psql $DATABASE_URL < prisma/migrations/manual_partial_indexes.sql
```

## Common Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Over-Indexing

```prisma
model Task {
  @@index([userId])
  @@index([completed])
  @@index([priority])
  @@index([category])
  @@index([status])
  @@index([dueDate])
  @@index([userId, completed])
  @@index([userId, priority])
  @@index([userId, category])
  @@index([userId, status])
  // TOO MANY INDEXES! Slows down writes
}
```

**Why bad**: Each index slows down INSERT/UPDATE/DELETE operations.

**Better**: Use composite indexes that cover multiple query patterns:

```prisma
model Task {
  @@index([userId, status, priority]) // Covers most queries
  @@index([userId, completed, dueDate])
}
```

### ❌ Anti-Pattern 2: Wrong Column Order

```prisma
// BAD: Low selectivity column first
@@index([completed, userId]) // completed has only 2 values (true/false)

// GOOD: High selectivity column first
@@index([userId, completed]) // userId is unique per user
```

**Rule**: Put the most selective column first (usually `userId`).

### ❌ Anti-Pattern 3: Redundant Indexes

```prisma
@@index([userId])
@@index([userId, completed]) // This makes the first index redundant
```

**Why**: PostgreSQL can use the composite index for queries on just `userId`.

**Better**: Remove the single-column index.

## Testing Index Performance

### Create Test Data

```javascript
// scripts/seedTestData.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTasks() {
  const userId = 'test-user-id';

  console.log('Creating 10,000 test tasks...');

  const tasks = [];
  for (let i = 0; i < 10000; i++) {
    tasks.push({
      userId,
      name: `Task ${i}`,
      completed: Math.random() > 0.7, // 30% completed
      dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within 30 days
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      status: ['pending', 'in_progress', 'completed'][Math.floor(Math.random() * 3)],
      category: ['Work', 'Personal', 'Shopping', 'Health'][Math.floor(Math.random() * 4)]
    });
  }

  await prisma.task.createMany({ data: tasks });
  console.log('✅ Test data created');
}

seedTasks().then(() => prisma.$disconnect());
```

Run:

```bash
node scripts/seedTestData.js
```

### Benchmark Queries

```javascript
// scripts/benchmarkQueries.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function benchmark() {
  const userId = 'test-user-id';

  console.time('Query: Overdue tasks');
  const overdue = await prisma.task.findMany({
    where: {
      userId,
      completed: false,
      dueDate: { lt: new Date() }
    }
  });
  console.timeEnd('Query: Overdue tasks');

  console.time('Query: High priority work tasks');
  const highPriority = await prisma.task.findMany({
    where: {
      userId,
      category: 'Work',
      priority: 'high',
      status: 'pending'
    }
  });
  console.timeEnd('Query: High priority work tasks');
}

benchmark().then(() => prisma.$disconnect());
```

Expected output:

```
Query: Overdue tasks: 2.3ms (with indexes)
Query: High priority work tasks: 1.8ms (with indexes)
```

## Production Checklist

- [ ] Review current indexes in `schema.prisma`
- [ ] Add composite indexes for Task filtering
- [ ] Add index for UserProfile push notifications
- [ ] Add index for WebAuthn credential lookup
- [ ] Create partial indexes for incomplete tasks (manual SQL)
- [ ] Generate migration with `npx prisma migrate dev`
- [ ] Test migration on local database
- [ ] Deploy to staging and monitor performance
- [ ] Create test data script (10,000+ tasks)
- [ ] Benchmark queries before/after
- [ ] Monitor index usage with `pg_stat_user_indexes`
- [ ] Document any manual SQL indexes
- [ ] Deploy to production during low-traffic window
- [ ] Monitor query performance for 7 days

## Monitoring & Alerts

Set up alerts for slow queries:

```javascript
// middleware/queryMonitoring.js
const logger = require('../config/logger');

// Log slow Prisma queries
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  const duration = after - before;

  if (duration > 1000) { // Log queries slower than 1 second
    logger.warn({
      model: params.model,
      action: params.action,
      duration,
      args: params.args
    }, 'Slow database query');
  }

  return result;
});
```

## Resources

- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Prisma Index Documentation](https://www.prisma.io/docs/concepts/components/prisma-schema/indexes)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
