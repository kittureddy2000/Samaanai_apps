# Migrating to TypeScript

## Why TypeScript?

**Current Issues with JavaScript:**
- No compile-time type checking
- Errors discovered at runtime in production
- Poor IDE autocomplete for Prisma models
- Difficult to refactor safely
- API response types undocumented

**Benefits of TypeScript:**
- ✅ Catch errors before deployment
- ✅ Better autocomplete and IntelliSense
- ✅ Self-documenting code with type annotations
- ✅ Safer refactoring with compiler assistance
- ✅ Excellent Prisma integration (auto-generated types)
- ✅ Easier onboarding (types serve as documentation)

## Migration Strategy

**Don't convert everything at once!** TypeScript and JavaScript can coexist. Use gradual migration:

1. **Week 1**: Setup TypeScript, convert utilities
2. **Week 2**: Convert one feature (start with todo)
3. **Weeks 3-6**: Convert remaining features one at a time
4. **Week 7**: Convert server.js and app.js

## Step 1: Setup TypeScript

### Install Dependencies

```bash
cd backend-express

npm install --save-dev typescript @types/node @types/express @types/cors \
  @types/passport @types/passport-jwt @types/passport-google-oauth20 \
  @types/jsonwebtoken @types/bcrypt ts-node nodemon
```

### Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["node", "express"],
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.js"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.test.js"
  ]
}
```

### Update package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "dev:js": "nodemon src/server.js",
    "build": "tsc",
    "start": "node dist/server.js",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "lint": "eslint src/**/*.{js,ts}"
  }
}
```

### Update nodemon.json

```json
{
  "watch": ["src"],
  "ext": "ts,js,json",
  "ignore": ["src/**/*.test.ts", "src/**/*.test.js"],
  "exec": "ts-node ./src/server.ts"
}
```

## Step 2: Create Type Definitions

Create `src/types/` folder for custom types:

### src/types/express.d.ts

Extend Express Request with user property:

```typescript
import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

### src/types/index.ts

Common types used across features:

```typescript
import { Request, Response, NextFunction } from 'express';

// Controller function type
export type Controller = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Common DTOs (Data Transfer Objects)
export interface CreateTaskDTO {
  name: string;
  description?: string;
  dueDate?: Date | string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  reminderType?: 'none' | 'on_time' | 'before';
}

export interface UpdateTaskDTO extends Partial<CreateTaskDTO> {
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface CreateMealDTO {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  description?: string;
  calories: number;
  date?: Date | string;
}

export interface UpdateMealDTO extends Partial<CreateMealDTO> {}

// Service response type with error handling
export type ServiceResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};
```

## Step 3: Example Conversions

### Example 1: Simple Service

**Before (JavaScript)** - `src/features/todo/todo.service.js`:

```javascript
const { prisma } = require('../../shared/config/database');

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
```

**After (TypeScript)** - `src/features/todo/todo.service.ts`:

```typescript
import { prisma } from '../../shared/config/database';
import { Task, Prisma } from '@prisma/client';
import { CreateTaskDTO } from '../../types';

// Task with subtasks included
type TaskWithSubtasks = Prisma.TaskGetPayload<{
  include: { subtasks: true };
}>;

interface TaskFilters {
  status?: 'pending' | 'in_progress' | 'completed';
  category?: string;
}

export const getTasksByUser = async (
  userId: string,
  filters: TaskFilters = {}
): Promise<TaskWithSubtasks[]> => {
  const where: Prisma.TaskWhereInput = { userId };

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

export const createTask = async (
  userId: string,
  taskData: CreateTaskDTO
): Promise<Task> => {
  return prisma.task.create({
    data: {
      ...taskData,
      userId
    }
  });
};

export const getTaskById = async (
  taskId: string,
  userId: string
): Promise<Task | null> => {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      userId
    }
  });
};
```

### Example 2: Controller with Validation

**Before (JavaScript)** - `src/features/todo/todo.controller.js`:

```javascript
const todoService = require('./todo.service');
const logger = require('../../shared/config/logger');
const { validationResult } = require('express-validator');

exports.getTasks = async (req, res) => {
  try {
    const tasks = await todoService.getTasksByUser(req.user.id, req.query);
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
```

**After (TypeScript)** - `src/features/todo/todo.controller.ts`:

```typescript
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as todoService from './todo.service';
import logger from '../../shared/config/logger';
import { ApiResponse } from '../../types';
import { Task } from '@prisma/client';

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id; // Non-null assertion (auth middleware ensures user exists)
    const filters = {
      status: req.query.status as 'pending' | 'in_progress' | 'completed' | undefined,
      category: req.query.category as string | undefined
    };

    const tasks = await todoService.getTasksByUser(userId, filters);

    res.json(tasks);
  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Failed to fetch tasks');
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const userId = req.user!.id;
    const task = await todoService.createTask(userId, req.body);

    logger.info({ userId, taskId: task.id }, 'Task created');

    const response: ApiResponse<Task> = {
      success: true,
      data: task
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Failed to create task');
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  try {
    const userId = req.user!.id;
    const taskId = req.params.id;

    // Check task exists and belongs to user
    const existingTask = await todoService.getTaskById(taskId, userId);
    if (!existingTask) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const updatedTask = await todoService.updateTask(taskId, req.body);

    logger.info({ userId, taskId }, 'Task updated');
    res.json(updatedTask);
  } catch (error) {
    logger.error({ err: error, userId: req.user?.id }, 'Failed to update task');
    res.status(500).json({ error: 'Failed to update task' });
  }
};
```

### Example 3: Routes

**Before (JavaScript)** - `src/features/todo/todo.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const todoController = require('./todo.controller');
const { taskValidation, taskUpdateValidation } = require('./todo.validation');
const auth = require('../../shared/middleware/auth');

router.use(auth);

router.get('/tasks', todoController.getTasks);
router.post('/tasks', taskValidation, todoController.createTask);
router.put('/tasks/:id', taskUpdateValidation, todoController.updateTask);
router.delete('/tasks/:id', todoController.deleteTask);

module.exports = router;
```

**After (TypeScript)** - `src/features/todo/todo.routes.ts`:

```typescript
import { Router } from 'express';
import * as todoController from './todo.controller';
import { taskValidation, taskUpdateValidation } from './todo.validation';
import { auth } from '../../shared/middleware/auth';

const router = Router();

// All routes require authentication
router.use(auth);

// Task CRUD
router.get('/tasks', todoController.getTasks);
router.post('/tasks', taskValidation, todoController.createTask);
router.put('/tasks/:id', taskUpdateValidation, todoController.updateTask);
router.delete('/tasks/:id', todoController.deleteTask);

// Task statistics
router.get('/tasks/stats', todoController.getTaskStats);

export default router;
```

### Example 4: Configuration File

**Before (JavaScript)** - `src/shared/config/database.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

module.exports = { prisma };
```

**After (TypeScript)** - `src/shared/config/database.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error']
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export { prisma };
export default prisma;
```

## Step 4: Update Dockerfile for TypeScript

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev for TypeScript compilation)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src ./src
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma schema
COPY prisma ./prisma

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start production server
CMD ["node", "dist/server.js"]
```

## Common Patterns

### Pattern 1: Type-Safe Environment Variables

**src/shared/config/env.ts**:

```typescript
interface EnvironmentVariables {
  NODE_ENV: 'development' | 'staging' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  LOG_LEVEL?: string;
}

export const env: EnvironmentVariables = {
  NODE_ENV: (process.env.NODE_ENV as EnvironmentVariables['NODE_ENV']) || 'development',
  PORT: parseInt(process.env.PORT || '8080', 10),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  LOG_LEVEL: process.env.LOG_LEVEL
};

export const validateEnv = (): void => {
  const required: (keyof EnvironmentVariables)[] = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];

  const missing = required.filter(key => !env[key]);

  if (missing.length > 0 && (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging')) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

### Pattern 2: Type-Safe Middleware

**src/shared/middleware/auth.ts**:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const auth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Optional auth (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
};
```

### Pattern 3: Error Handling with Types

**src/shared/utils/errors.ts**:

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}
```

**src/shared/middleware/errorHandler.ts**:

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn({ err, path: req.path }, err.message);
    res.status(err.statusCode).json({
      error: err.message
    });
    return;
  }

  // Unhandled errors
  logger.error({ err, path: req.path }, 'Unhandled error');

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
};
```

## Migration Checklist

### Week 1: Setup
- [ ] Install TypeScript dependencies
- [ ] Create `tsconfig.json`
- [ ] Update `package.json` scripts
- [ ] Create `src/types/` folder
- [ ] Update `nodemon.json`
- [ ] Test that `npm run dev` works

### Week 2: Convert Todo Feature
- [ ] Convert `todo.service.js` → `todo.service.ts`
- [ ] Convert `todo.controller.js` → `todo.controller.ts`
- [ ] Convert `todo.routes.js` → `todo.routes.ts`
- [ ] Update imports in other files
- [ ] Run `npm run type-check`
- [ ] Test todo endpoints

### Week 3: Convert Nutrition Feature
- [ ] Same steps as todo feature

### Week 4: Convert Auth Feature
- [ ] Same steps as todo feature

### Week 6: Convert Shared Code
- [ ] Convert `middleware/auth.js` → `middleware/auth.ts`
- [ ] Convert `config/database.js` → `config/database.ts`
- [ ] Convert `config/logger.js` → `config/logger.ts`
- [ ] Convert `config/env.js` → `config/env.ts`

### Week 7: Convert Entry Points
- [ ] Convert `app.js` → `app.ts`
- [ ] Convert `server.js` → `server.ts`
- [ ] Update Dockerfile
- [ ] Full integration test
- [ ] Deploy to staging

## Testing TypeScript

Run type checking without compilation:

```bash
npm run type-check
```

Build to JavaScript:

```bash
npm run build
```

Check output:

```bash
ls -la dist/
```

Run production build locally:

```bash
NODE_ENV=production node dist/server.js
```

## Common TypeScript Errors

### Error 1: "Cannot find module"

**Problem**: Import paths don't match

```typescript
// ❌ Wrong
import { prisma } from '../database';

// ✅ Correct
import { prisma } from '../config/database';
```

**Solution**: Use correct relative paths

### Error 2: "Property 'user' does not exist on type 'Request'"

**Problem**: Express types don't know about `req.user`

**Solution**: Extend Express types in `src/types/express.d.ts` (shown above)

### Error 3: "Argument of type 'string | undefined' is not assignable"

**Problem**: Query params can be undefined

```typescript
// ❌ Wrong
const status: string = req.query.status;

// ✅ Correct
const status = req.query.status as string | undefined;
```

### Error 4: "Type 'void' is not assignable to type 'Promise<void>'"

**Problem**: Controller functions must not return response

```typescript
// ❌ Wrong
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  const tasks = await todoService.getTasks();
  return res.json(tasks); // ❌ Returns Response object
};

// ✅ Correct
export const getTasks = async (req: Request, res: Response): Promise<void> => {
  const tasks = await todoService.getTasks();
  res.json(tasks); // ✅ No return
};
```

## Benefits After Migration

**Before (JavaScript)**:
```javascript
// No type hints
const user = await prisma.user.findUnique({ where: { id: userId } });
console.log(user.emial); // Typo! Runtime error in production 💥
```

**After (TypeScript)**:
```typescript
// Full autocomplete and compile-time checking
const user = await prisma.user.findUnique({ where: { id: userId } });
console.log(user.emial); // ❌ TypeScript error: Property 'emial' does not exist
console.log(user.email); // ✅ Correct
```

**IDE autocomplete for Prisma models:**
- All model fields
- Relations
- Query options
- No guessing!

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Prisma with TypeScript](https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/use-custom-model-and-field-names)
- [Express with TypeScript](https://github.com/microsoft/TypeScript-Node-Starter)
- [Type-safe Express Tutorial](https://www.youtube.com/watch?v=qy8PxD3alWw)
