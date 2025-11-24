# Feature-Based Folder Structure Migration

## Problem with Current Structure

The current codebase uses a layer-based (technical) structure:

```
src/
├── controllers/     # All controllers mixed together
│   ├── authController.js
│   ├── nutritionController.js
│   ├── todoController.js
│   └── integrationController.js
├── routes/          # All routes mixed together
│   ├── auth.js
│   ├── nutrition.js
│   ├── todo.js
│   └── integrations.js
├── services/        # All services mixed together
│   ├── emailService.js
│   ├── pushNotificationService.js
│   └── schedulerService.js
└── middleware/
    ├── auth.js
    ├── rateLimiter.js
    └── requestLogger.js
```

**Problems:**
1. **Low Cohesion**: Related code scattered across different folders
2. **Hard to Navigate**: Finding all todo-related code requires checking 5+ folders
3. **Merge Conflicts**: Multiple developers working on different features touch the same folders
4. **Difficult to Isolate**: Can't easily see dependencies between features
5. **Slow Onboarding**: New developers can't understand feature boundaries
6. **Testing Complexity**: Tests mirror the same scattered structure

## Recommended Structure: Feature-Based

Organize code by **business domain** instead of technical layer:

```
src/
├── features/
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   ├── auth.validation.js
│   │   ├── auth.test.js
│   │   └── index.js              # Export public API
│   ├── nutrition/
│   │   ├── nutrition.routes.js
│   │   ├── nutrition.controller.js
│   │   ├── nutrition.service.js
│   │   ├── nutrition.validation.js
│   │   ├── nutrition.test.js
│   │   └── index.js
│   ├── todo/
│   │   ├── todo.routes.js
│   │   ├── todo.controller.js
│   │   ├── todo.service.js
│   │   ├── todo.validation.js
│   │   ├── todo.test.js
│   │   └── index.js
│   ├── integrations/
│   │   ├── integrations.routes.js
│   │   ├── integrations.controller.js
│   │   ├── microsoft.service.js  # Feature-specific service
│   │   ├── integrations.validation.js
│   │   ├── integrations.test.js
│   │   └── index.js
│   └── notifications/             # Cross-cutting feature
│       ├── email.service.js
│       ├── push.service.js
│       ├── scheduler.service.js
│       ├── notification.test.js
│       └── index.js
├── shared/                        # Truly shared utilities
│   ├── middleware/
│   │   ├── auth.js               # Shared auth middleware
│   │   ├── rateLimiter.js
│   │   ├── requestLogger.js
│   │   └── errorHandler.js
│   ├── config/
│   │   ├── database.js
│   │   ├── logger.js
│   │   ├── passport.js
│   │   └── env.js
│   └── utils/
│       ├── validation.js
│       └── constants.js
├── server.js
└── app.js
```

## Benefits

✅ **Better Cohesion**: All todo-related code in one folder
✅ **Clear Boundaries**: Easy to see what belongs to each feature
✅ **Parallel Development**: Teams can work on different features without conflicts
✅ **Easy to Find**: Want todo logic? Look in `src/features/todo/`
✅ **Easier Testing**: Tests live next to the code they test
✅ **Simpler Extraction**: Moving to microservices? Extract the whole feature folder
✅ **Onboarding**: New developers can start with one feature folder

## Migration Strategy

**Don't migrate all at once!** Use gradual, feature-by-feature migration:

### Phase 1: Pick One Feature (Week 1)

Start with the simplest feature to learn the pattern. **Recommended: todo**

#### Step 1: Create Feature Folder

```bash
mkdir -p src/features/todo
```

#### Step 2: Move Files with Renaming

```bash
# Move and rename to follow convention
cp src/routes/todo.js src/features/todo/todo.routes.js
cp src/controllers/todoController.js src/features/todo/todo.controller.js

# If you have a todo service (create one if you don't)
touch src/features/todo/todo.service.js
```

#### Step 3: Update Imports in Moved Files

**src/features/todo/todo.routes.js**:
```javascript
// Before:
const todoController = require('../controllers/todoController');
const auth = require('../middleware/auth');

// After:
const todoController = require('./todo.controller');
const auth = require('../../shared/middleware/auth');
```

**src/features/todo/todo.controller.js**:
```javascript
// Before:
const { prisma } = require('../config/database');
const logger = require('../config/logger');

// After:
const { prisma } = require('../../shared/config/database');
const logger = require('../../shared/config/logger');
```

#### Step 4: Create Public API Export

**src/features/todo/index.js**:
```javascript
/**
 * Todo feature public API
 * Only export what other features should use
 */

const todoRoutes = require('./todo.routes');

module.exports = {
  todoRoutes
};
```

#### Step 5: Update server.js

**src/server.js**:
```javascript
// Before:
const todoRoutes = require('./routes/todo');

// After:
const { todoRoutes } = require('./features/todo');
```

#### Step 6: Test Thoroughly

```bash
# Run tests
npm test

# Start server
npm run dev

# Test todo endpoints manually
curl http://localhost:8080/api/v1/todo/tasks \
  -H "Authorization: Bearer $TOKEN"
```

#### Step 7: Remove Old Files (After Verification)

```bash
# Only after confirming everything works!
git rm src/routes/todo.js
git rm src/controllers/todoController.js
```

### Phase 2: Migrate Remaining Features (Weeks 2-4)

Repeat the same process for:

**Week 2: nutrition**
```bash
mkdir -p src/features/nutrition
mv src/routes/nutrition.js src/features/nutrition/nutrition.routes.js
mv src/controllers/nutritionController.js src/features/nutrition/nutrition.controller.js
# Update imports, create index.js, test, cleanup
```

**Week 3: auth**
```bash
mkdir -p src/features/auth
mv src/routes/auth.js src/features/auth/auth.routes.js
mv src/controllers/authController.js src/features/auth/auth.controller.js
# Update imports, create index.js, test, cleanup
```

### Phase 3: Extract Cross-Cutting Concerns (Week 5)

Create shared notifications feature:

```bash
mkdir -p src/features/notifications
mv src/services/emailService.js src/features/notifications/email.service.js
mv src/services/pushNotificationService.js src/features/notifications/push.service.js
mv src/services/schedulerService.js src/features/notifications/scheduler.service.js
```

**src/features/notifications/index.js**:
```javascript
const { sendEmail, sendWeeklyReport } = require('./email.service');
const { sendPushNotification, sendTaskReminderNotification } = require('./push.service');
const { initializeScheduler } = require('./scheduler.service');

module.exports = {
  // Email exports
  sendEmail,
  sendWeeklyReport,

  // Push notification exports
  sendPushNotification,
  sendTaskReminderNotification,

  // Scheduler exports
  initializeScheduler
};
```

### Phase 4: Consolidate Shared Code (Week 6)

Move truly shared code to `src/shared/`:

```bash
mkdir -p src/shared/middleware
mkdir -p src/shared/config
mkdir -p src/shared/utils

mv src/middleware/* src/shared/middleware/
mv src/config/* src/shared/config/
```

## Example: Complete Todo Feature

Here's what the complete todo feature looks like:

**src/features/todo/todo.routes.js**:
```javascript
const express = require('express');
const router = express.Router();
const todoController = require('./todo.controller');
const { taskValidation, taskUpdateValidation } = require('./todo.validation');
const auth = require('../../shared/middleware/auth');

// All routes require authentication
router.use(auth);

// Task CRUD
router.get('/tasks', todoController.getTasks);
router.post('/tasks', taskValidation, todoController.createTask);
router.put('/tasks/:id', taskUpdateValidation, todoController.updateTask);
router.delete('/tasks/:id', todoController.deleteTask);

// Task statistics
router.get('/tasks/stats', todoController.getTaskStats);

module.exports = router;
```

**src/features/todo/todo.controller.js**:
```javascript
const todoService = require('./todo.service');
const logger = require('../../shared/config/logger');
const { validationResult } = require('express-validator');

exports.getTasks = async (req, res) => {
  try {
    const tasks = await todoService.getTasksByUser(req.user.id);
    res.json(tasks);
  } catch (error) {
    logger.error({ err: error, userId: req.user.id }, 'Failed to fetch tasks');
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

exports.createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const task = await todoService.createTask(req.user.id, req.body);
    logger.info({ userId: req.user.id, taskId: task.id }, 'Task created');
    res.status(201).json(task);
  } catch (error) {
    logger.error({ err: error, userId: req.user.id }, 'Failed to create task');
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// ... other controller methods
```

**src/features/todo/todo.service.js**:
```javascript
const { prisma } = require('../../shared/config/database');

/**
 * Business logic for todo feature
 * Keep controllers thin, services thick
 */

exports.getTasksByUser = async (userId, filters = {}) => {
  const where = { userId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  return prisma.task.findMany({
    where,
    orderBy: [
      { priority: 'desc' },
      { dueDate: 'asc' }
    ],
    include: {
      subtasks: true
    }
  });
};

exports.createTask = async (userId, taskData) => {
  return prisma.task.create({
    data: {
      ...taskData,
      userId
    }
  });
};

exports.getOverdueTasks = async (userId) => {
  return prisma.task.findMany({
    where: {
      userId,
      dueDate: {
        lt: new Date()
      },
      status: {
        not: 'completed'
      }
    }
  });
};

// ... other service methods
```

**src/features/todo/todo.validation.js**:
```javascript
const { body, param } = require('express-validator');

exports.taskValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task name must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category must be less than 50 characters')
];

exports.taskUpdateValidation = [
  param('id')
    .isUUID()
    .withMessage('Task ID must be a valid UUID'),
  ...exports.taskValidation
];
```

**src/features/todo/todo.test.js**:
```javascript
const request = require('supertest');
const app = require('../../app');
const { prisma } = require('../../shared/config/database');

describe('Todo Feature', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create test user and get auth token
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = res.body.token;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.task.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/todo/tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app)
        .post('/api/v1/todo/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test task',
          description: 'Test description',
          priority: 'high'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test task');
    });

    it('should reject task with invalid priority', async () => {
      const res = await request(app)
        .post('/api/v1/todo/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test task',
          priority: 'invalid'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/todo/tasks', () => {
    it('should return user tasks', async () => {
      const res = await request(app)
        .get('/api/v1/todo/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/v1/todo/tasks');

      expect(res.statusCode).toBe(401);
    });
  });
});
```

**src/features/todo/index.js**:
```javascript
/**
 * Todo feature public API
 * Only routes are exported - controllers and services are internal
 */

const todoRoutes = require('./todo.routes');

module.exports = {
  todoRoutes
};
```

## Testing the Migration

After each feature migration:

### 1. Run Unit Tests

```bash
npm test -- src/features/todo/todo.test.js
```

### 2. Integration Test

```bash
# Start server
npm run dev

# Test endpoints
curl http://localhost:8080/api/v1/todo/tasks \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Check for Broken Imports

```bash
# Search for old import paths
grep -r "require('./routes/todo')" src/
grep -r "require('../controllers/todoController')" src/
```

## Common Pitfalls

### 1. Circular Dependencies

**Problem**: Feature A imports Feature B, Feature B imports Feature A

**Solution**: Extract shared logic to `src/shared/` or use dependency injection

```javascript
// BAD: Circular dependency
// src/features/todo/todo.service.js
const { sendEmail } = require('../notifications/email.service');

// src/features/notifications/email.service.js
const { getTasks } = require('../todo/todo.service');

// GOOD: Break the cycle
// src/features/notifications/email.service.js
exports.sendTaskSummaryEmail = async (userId, tasks) => {
  // Caller provides tasks, no need to import todo service
};

// src/features/todo/todo.service.js
const { sendTaskSummaryEmail } = require('../notifications');
const tasks = await this.getTasksByUser(userId);
await sendTaskSummaryEmail(userId, tasks);
```

### 2. Over-Nesting

**Problem**: Creating too many subfolders

```
src/features/todo/
  ├── controllers/
  ├── services/
  ├── models/
  └── utils/
```

**Solution**: Keep it flat for small features

```
src/features/todo/
  ├── todo.routes.js
  ├── todo.controller.js
  ├── todo.service.js
  └── todo.validation.js
```

### 3. Unclear Feature Boundaries

**Problem**: Not sure if code belongs to feature X or Y

**Solution**: Ask: "If this feature became a microservice, would this code move with it?"

- Yes → Belongs in the feature
- No → Belongs in `src/shared/`

## Rollout Checklist

- [ ] Week 1: Migrate `todo` feature
  - [ ] Create `src/features/todo/` folder
  - [ ] Move and rename files
  - [ ] Update all imports
  - [ ] Create `index.js` public API
  - [ ] Update `server.js`
  - [ ] Run tests
  - [ ] Test endpoints manually
  - [ ] Remove old files

- [ ] Week 2: Migrate `nutrition` feature
  - [ ] Same steps as todo

- [ ] Week 3: Migrate `auth` feature
  - [ ] Same steps as todo

- [ ] Week 5: Extract `notifications` feature
  - [ ] Move email service
  - [ ] Move push notification service
  - [ ] Move scheduler service
  - [ ] Update all features that use notifications

- [ ] Week 6: Create `src/shared/`
  - [ ] Move middleware
  - [ ] Move config
  - [ ] Move utils
  - [ ] Update all feature imports

- [ ] Week 7: Documentation & cleanup
  - [ ] Update README
  - [ ] Document feature boundaries
  - [ ] Remove empty old folders
  - [ ] Update import paths in tests

## Measuring Success

After migration:

**Before (Layer-Based)**:
- "Where is the todo delete logic?" → Check 3-5 files across different folders
- "What does the todo feature depend on?" → Trace imports manually
- Merge conflicts on `controllers/` folder

**After (Feature-Based)**:
- "Where is the todo delete logic?" → `src/features/todo/` folder
- "What does the todo feature depend on?" → Check `index.js` imports
- No merge conflicts (different features in different folders)

## References

- [Feature-Sliced Design](https://feature-sliced.design/)
- [Screaming Architecture](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)
- [Package by Feature, Not Layer](https://phauer.com/2020/package-by-feature/)
