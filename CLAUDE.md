# CLAUDE.md - AI Assistant Development Guide

This document provides comprehensive guidance for AI assistants working on the Samaanai platform. It covers codebase structure, development workflows, coding conventions, and best practices.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Repository Structure](#repository-structure)
- [Technology Stack](#technology-stack)
- [Development Workflows](#development-workflows)
- [Coding Conventions](#coding-conventions)
- [Database Schema & Patterns](#database-schema--patterns)
- [API Design Patterns](#api-design-patterns)
- [Testing Guidelines](#testing-guidelines)
- [Deployment & CI/CD](#deployment--cicd)
- [Common Tasks & Examples](#common-tasks--examples)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting Guide](#troubleshooting-guide)

---

## Project Overview

**Samaanai** is a full-stack nutrition tracking and task management platform built with:
- **Backend**: Express.js + Prisma ORM + PostgreSQL
- **Frontend**: React Native + Expo (Universal: iOS, Android, Web)
- **Infrastructure**: Google Cloud Platform (Cloud Run, Cloud SQL, Secret Manager)

### Core Features
1. **Nutrition Tracking**: Meals, exercises, weight tracking, daily reports
2. **Task Management**: Tasks with due dates, reminders, image attachments
3. **Integrations**: Google OAuth, Microsoft Graph API, Google Tasks
4. **Authentication**: JWT-based auth with Passport.js (local + OAuth)

---

## Repository Structure

```
Samaanai_apps/
├── backend-express/              # Express.js API Server
│   ├── src/
│   │   ├── config/              # App configuration (env, logger, passport, database)
│   │   ├── controllers/         # Business logic (authController, todoController, etc.)
│   │   ├── routes/              # API route definitions
│   │   ├── middleware/          # Auth, error handling, rate limiting
│   │   ├── services/            # External services (Microsoft Graph, etc.)
│   │   └── server.js            # Application entry point
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema definition
│   │   ├── migrations/          # Database migration history
│   │   └── seed.js              # Sample data seeding script
│   ├── Dockerfile               # Production container image
│   ├── package.json
│   └── cloudbuild.yaml          # GCP Cloud Build configuration
│
├── samaanai-mobile/             # React Native Universal App (Expo)
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── contexts/            # React contexts (AuthContext, etc.)
│   │   ├── navigation/          # React Navigation setup
│   │   ├── screens/             # App screens
│   │   │   ├── auth/           # Login, Register, etc.
│   │   │   ├── nutrition/      # Nutrition tracking screens
│   │   │   ├── todo/           # Task management screens
│   │   │   └── account/        # Profile, settings
│   │   ├── services/            # API client and utilities
│   │   ├── theme/              # Theme configuration
│   │   ├── styles/             # Shared styles
│   │   └── utils/              # Helper functions
│   ├── assets/                  # Images, fonts, icons
│   ├── app.config.js           # Expo configuration
│   ├── eas.json                # EAS Build configuration
│   └── package.json
│
├── .github/workflows/           # CI/CD Automation
│   ├── deploy-backend-staging-prod.yml    # Backend deployment
│   ├── deploy-frontend-staging-prod.yml   # Frontend deployment
│   ├── build-mobile-staging-prod.yml      # Mobile builds (EAS)
│   └── pr-tests.yml                       # Pull request tests
│
├── docker-compose.yml           # Local development environment
├── update-google-oauth.sh      # OAuth credential management script
├── dev.sh                      # Development helper script
└── README.md                   # User-facing documentation
```

### Key Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `schema.prisma` | Database schema (models, relations, indexes) | `backend-express/prisma/` |
| `server.js` | Express app setup, middleware, routes | `backend-express/src/` |
| `app.config.js` | Expo configuration (bundle IDs, permissions, schemes) | `samaanai-mobile/` |
| `eas.json` | EAS Build profiles (dev, staging, production) | `samaanai-mobile/` |
| `.env.example` | Environment variable templates | Root, backend, mobile |
| `docker-compose.yml` | Local PostgreSQL + backend + frontend setup | Root |

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **ORM**: Prisma 6.x (PostgreSQL)
- **Authentication**:
  - Passport.js (local strategy + Google OAuth 2.0)
  - JWT (jsonwebtoken) for session management
- **Validation**: express-validator
- **Logging**: Pino (structured logging)
- **Security**: Helmet, CORS, rate-limit-redis, bcrypt
- **External APIs**: Microsoft Graph API, Google Tasks API
- **Notifications**: Expo Server SDK (push notifications)
- **Email**: Nodemailer
- **Cron Jobs**: node-cron

### Frontend (Mobile)
- **Framework**: React Native 0.81 (via Expo 54)
- **UI Library**: React Native Paper 5.x
- **Navigation**: React Navigation 7.x (native-stack, bottom-tabs)
- **State Management**: React Context API
- **HTTP Client**: Axios 1.x
- **Forms**: Formik + Yup (validation)
- **Storage**:
  - AsyncStorage (general storage)
  - SecureStore (tokens, credentials)
- **Date Handling**: date-fns
- **Charts**: react-native-chart-kit + react-native-svg
- **OAuth**: expo-auth-session + expo-web-browser

### Database
- **Development**: PostgreSQL 15 (Docker)
- **Production**: Cloud SQL PostgreSQL 15 (GCP)
- **ORM**: Prisma (type-safe queries, migrations)

### DevOps & Infrastructure
- **Cloud Platform**: Google Cloud Platform
  - **Compute**: Cloud Run (serverless containers)
  - **Database**: Cloud SQL (PostgreSQL)
  - **Storage**: GCS (images, static assets)
  - **Secrets**: Secret Manager
  - **Registry**: Container Registry (gcr.io)
- **CI/CD**: GitHub Actions
- **Mobile Builds**: Expo Application Services (EAS)
- **Containerization**: Docker
- **Version Control**: Git + GitHub

---

## Development Workflows

### Branch Strategy

```
main (production)       ← Protected branch, requires PR approval
  └── staging (dev)     ← Direct push allowed, auto-deploys to staging
```

#### Branch Rules
1. **`main` branch**:
   - **Protected**: Cannot push directly
   - **Requires**: Pull request + approval
   - **Auto-deploys**: To production on merge
   - **Use for**: Production releases only

2. **`staging` branch**:
   - **Direct push**: Allowed for rapid iteration
   - **Auto-deploys**: To staging environment on push
   - **Use for**: All development work, testing, QA

3. **Feature branches** (optional):
   - **Naming**: `feature/description` or `fix/description`
   - **Merge into**: `staging` (not `main`)
   - **Use for**: Long-running features or collaborative work

### Development Flow

```bash
# 1. Start work on staging
git checkout staging
git pull origin staging

# 2. Make changes and commit
git add .
git commit -m "feat: add nutrition goal setting"
git push origin staging              # ← Auto-deploys to staging

# 3. Test in staging environment
# Visit: https://samaanai-backend-staging-*.run.app

# 4. After several days of testing, promote to production
gh pr create --base main --head staging \
  --title "Production Release - [Date]" \
  --body "### Changes
- Feature A
- Bug fix B
### Testing
- Staging tested for X days
- All tests passing"

# 5. Review and merge PR on GitHub
# Production automatically deploys after merge
```

### Commit Message Conventions

Follow **Conventional Commits** format:

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `chore`: Maintenance tasks (dependencies, config)
- `ci`: CI/CD changes
- `refactor`: Code refactoring (no functional changes)
- `test`: Adding or updating tests
- `perf`: Performance improvements

**Examples:**
```bash
feat: add weight tracking with period filtering and UX improvements
fix: prevent Microsoft sync from updating other users' tasks
docs: add comprehensive Google Tasks integration documentation
chore(backend): implement structured logging with Pino
ci: trigger deployment
```

**Scopes** (optional): `backend`, `mobile`, `ci`, `database`, etc.

### Local Development Setup

#### Option 1: Docker (Recommended)

```bash
# Start all services (PostgreSQL + backend + mobile)
docker-compose up -d --build

# Seed sample data
docker-compose exec backend node prisma/seed.js

# Access services:
# - Backend API: http://localhost:8080
# - Mobile web: http://localhost:19006
# - PostgreSQL: localhost:5432

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Full reset (removes database data)
docker-compose down -v
```

#### Option 2: Manual Setup

**Backend:**
```bash
cd backend-express
cp .env.example .env
# Edit .env with your database credentials
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

**Mobile:**
```bash
cd samaanai-mobile
cp .env.example .env
npm install
npx expo start --web    # For web
npx expo start          # For mobile (scan QR code)
```

### Making Database Changes

```bash
cd backend-express

# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_user_preferences

# 3. Migration files created in prisma/migrations/
# 4. Prisma client auto-regenerated

# Apply migrations to production (done automatically by CI/CD)
npx prisma migrate deploy
```

**Important**: Always test migrations locally before pushing.

---

## Coding Conventions

### General Principles
1. **Consistency**: Follow existing patterns in the codebase
2. **Simplicity**: Avoid over-engineering; write clear, maintainable code
3. **Security**: Never commit secrets; validate all user input
4. **Error Handling**: Always use try/catch and pass errors to middleware
5. **Type Safety**: Use Prisma types; avoid `any` in TypeScript

### Backend (Express.js) Patterns

#### Controller Structure

```javascript
// backend-express/src/controllers/exampleController.js
const { prisma } = require('../config/database');

// Always use async/await with try/catch
exports.getItems = async (req, res, next) => {
  try {
    // 1. Validate input (use express-validator in routes)
    const { filter, limit = 20 } = req.query;

    // 2. Query database (always filter by userId for security)
    const items = await prisma.item.findMany({
      where: {
        userId: req.user.id,  // CRITICAL: Always verify ownership
        ...(filter && { status: filter })
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    // 3. Return standardized response
    res.json({ items });
  } catch (error) {
    // 4. Pass errors to error handler middleware
    next(error);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const item = await prisma.item.create({
      data: {
        userId: req.user.id,
        name,
        description
      }
    });

    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // ALWAYS verify ownership before updating
    const existingItem = await prisma.item.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = await prisma.item.update({
      where: { id: req.params.id },
      data: { name, description }
    });

    res.json({ item });
  } catch (error) {
    next(error);
  }
};
```

#### Route Structure

```javascript
// backend-express/src/routes/example.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const exampleController = require('../controllers/exampleController');

// All routes require authentication (unless public endpoints like /health)
router.use(authenticate);

// RESTful naming conventions
router.get('/items', exampleController.getItems);
router.get('/items/:id', exampleController.getItem);
router.post('/items', exampleController.createItem);
router.patch('/items/:id', exampleController.updateItem);
router.delete('/items/:id', exampleController.deleteItem);

module.exports = router;
```

#### Middleware Patterns

```javascript
// backend-express/src/middleware/example.js
module.exports = (req, res, next) => {
  try {
    // Middleware logic
    next();
  } catch (error) {
    next(error);
  }
};
```

### Frontend (React Native) Patterns

#### Screen Component Structure

```javascript
// samaanai-mobile/src/screens/example/ExampleScreen.js
import React, { useState, useEffect, useContext } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Button, Text, Card } from 'react-native-paper';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function ExampleScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/items');
      setData(response.data.items);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineMedium">Example Screen</Text>
      {/* Component content */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  }
});
```

#### API Service Pattern

```javascript
// samaanai-mobile/src/services/api.js
import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: Constants.expoConfig.extra.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor (add JWT token)
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (handle 401, refresh tokens)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh or logout
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Files** | camelCase (JS), PascalCase (components) | `authController.js`, `LoginScreen.js` |
| **Variables** | camelCase | `userId`, `taskList` |
| **Constants** | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_RETRIES` |
| **Functions** | camelCase (verb prefix) | `getTasks()`, `createUser()` |
| **Components** | PascalCase | `TaskCard`, `LoginScreen` |
| **Database Models** | PascalCase | `User`, `Task`, `MealEntry` |
| **Routes** | kebab-case | `/api/v1/meal-entries` |

### Code Style

- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for JavaScript, double quotes for JSX
- **Semicolons**: Use semicolons
- **Trailing Commas**: Allowed in multiline objects/arrays
- **Line Length**: Aim for 80-100 characters (not strict)
- **Comments**: Use for complex logic, not obvious code

---

## Database Schema & Patterns

### Core Models

```prisma
// Key models from backend-express/prisma/schema.prisma

model User {
  id              String    @id @default(uuid())
  username        String    @unique
  email           String    @unique
  password        String?   // Null for OAuth users
  googleId        String?   @unique
  firstName       String?
  lastName        String?
  isActive        Boolean   @default(true)
  dateJoined      DateTime  @default(now())
  lastLogin       DateTime?

  profile         UserProfile?
  tasks           Task[]
  mealEntries     MealEntry[]
  exerciseEntries ExerciseEntry[]
  weightEntries   WeightEntry[]
  integrations    Integration[]

  @@map("auth_user")
}

model Task {
  id              String    @id @default(uuid())
  userId          String
  name            String
  description     String?
  dueDate         DateTime? @db.Date
  reminderType    String?   // 'daily', 'weekly', 'monthly', 'yearly'
  imageUrl        String?
  completed       Boolean   @default(false)
  completedAt     DateTime?
  microsoftTodoId String?   @unique
  googleTaskId    String?   @unique
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, dueDate(sort: Asc)])
  @@index([userId, completed])
  @@map("todo_task")
}

model Integration {
  id           String    @id @default(uuid())
  userId       String
  provider     String    // 'microsoft', 'google'
  accessToken  String
  refreshToken String?
  expiresAt    DateTime?
  scope        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@map("integrations")
}
```

### Database Query Patterns

#### Always Filter by User

```javascript
// ✅ CORRECT: Filter by userId
const tasks = await prisma.task.findMany({
  where: { userId: req.user.id }
});

// ❌ WRONG: Missing userId filter (security risk!)
const tasks = await prisma.task.findMany();
```

#### Use Transactions for Multi-Table Operations

```javascript
await prisma.$transaction(async (tx) => {
  const task = await tx.task.create({ data: taskData });
  await tx.integration.update({
    where: { id: integrationId },
    data: { lastSyncedAt: new Date() }
  });
});
```

#### Optimize with Indexes

```prisma
// Add indexes for frequently queried fields
@@index([userId, dueDate(sort: Asc)])
@@index([userId, completed])
```

---

## API Design Patterns

### API Versioning

All endpoints use `/api/v1/` prefix for versioning:

```
/api/v1/auth/*
/api/v1/todo/*
/api/v1/nutrition/*
/api/v1/user/*
/api/v1/integrations/*
```

### Endpoint Structure

```
GET    /api/v1/resource        - List all (with pagination/filtering)
GET    /api/v1/resource/:id    - Get one by ID
POST   /api/v1/resource        - Create new
PATCH  /api/v1/resource/:id    - Update (partial)
DELETE /api/v1/resource/:id    - Delete
```

### Request/Response Formats

#### Success Response

```json
{
  "tasks": [
    {
      "id": "uuid",
      "name": "Task name",
      "completed": false,
      "dueDate": "2025-01-15"
    }
  ]
}
```

#### Error Response

```json
{
  "error": "Task not found",
  "message": "No task found with ID xyz"
}
```

### Authentication

All protected endpoints require JWT token:

```
Authorization: Bearer <jwt_token>
```

Tokens are issued by `/api/v1/auth/login` and `/api/v1/auth/google/callback`.

---

## Testing Guidelines

### Backend Testing

```bash
cd backend-express
npm test                  # Run all tests
npm run test:watch       # Watch mode
```

**Test Structure:**
```javascript
// backend-express/src/__tests__/auth.test.js
const request = require('supertest');
const app = require('../server');

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```

### Frontend Testing

```bash
cd samaanai-mobile
npm test
```

---

## Deployment & CI/CD

### Environments

| Environment | Branch | GCP Project | Database | URL |
|------------|--------|-------------|----------|-----|
| **Staging** | `staging` | `samaanai-stg-*` | Cloud SQL Staging | `samaanai-backend-staging-*.run.app` |
| **Production** | `main` | `samaanai-prod-*` | Cloud SQL Production | `api.samaanai.com` |

### Automated Deployments

**Triggers:**
- Push to `staging` → Deploy to staging
- Push to `main` (via PR merge) → Deploy to production
- Manual trigger via GitHub Actions

**Workflow:**
1. Run tests
2. Build Docker image
3. Push to GCR (Google Container Registry)
4. Deploy to Cloud Run
5. Run database migrations (via Cloud Run Jobs)
6. Health check

**Monitoring Deployments:**
```bash
# View deployment status
gh run list --branch staging

# Watch active deployment
gh run watch

# View Cloud Run logs
gcloud run services logs read samaanai-backend-staging \
  --project=samaanai-stg-1009-124126 \
  --limit=100
```

### Manual Deployment (Emergency)

```bash
# Set project
gcloud config set project samaanai-stg-1009-124126

# Build image
cd backend-express
docker build -t gcr.io/samaanai-stg-1009-124126/samaanai-backend-staging:manual .

# Push image
docker push gcr.io/samaanai-stg-1009-124126/samaanai-backend-staging:manual

# Deploy
gcloud run deploy samaanai-backend-staging \
  --image gcr.io/samaanai-stg-1009-124126/samaanai-backend-staging:manual \
  --region us-west1
```

### Environment Variables

**Development (.env):**
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/samaanai
JWT_SECRET=dev-jwt-secret
NODE_ENV=development
```

**Production (GCP Secret Manager):**
Secrets are managed via GCP Secret Manager and injected at runtime:
```bash
# Create/update secret
echo -n "secret-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# List secrets
gcloud secrets list

# View secret value
gcloud secrets versions access latest --secret=DATABASE_URL
```

### Mobile Builds (EAS)

```bash
cd samaanai-mobile

# Build for staging
eas build --platform android --profile staging
eas build --platform ios --profile staging

# Build for production
eas build --platform android --profile production
eas build --platform ios --profile production

# View builds
eas build:list

# Submit to app stores
eas submit --platform android
eas submit --platform ios
```

---

## Common Tasks & Examples

### Adding a New API Endpoint

1. **Create Controller** (`backend-express/src/controllers/exampleController.js`)
2. **Create Route** (`backend-express/src/routes/example.js`)
3. **Register Route** in `server.js`:
   ```javascript
   const exampleRoutes = require('./routes/example');
   app.use('/api/v1/example', exampleRoutes);
   ```
4. **Test Endpoint**:
   ```bash
   curl -X GET http://localhost:8080/api/v1/example \
     -H "Authorization: Bearer <token>"
   ```

### Adding a New Screen (Mobile)

1. **Create Screen** (`samaanai-mobile/src/screens/example/ExampleScreen.js`)
2. **Register in Navigation** (`samaanai-mobile/src/navigation/AppNavigator.js`):
   ```javascript
   <Stack.Screen name="Example" component={ExampleScreen} />
   ```
3. **Navigate to Screen**:
   ```javascript
   navigation.navigate('Example', { param: value });
   ```

### Adding a Database Model

1. **Edit Prisma Schema** (`backend-express/prisma/schema.prisma`):
   ```prisma
   model NewModel {
     id        String   @id @default(uuid())
     userId    String
     name      String
     createdAt DateTime @default(now())

     user User @relation(fields: [userId], references: [id], onDelete: Cascade)

     @@map("new_model")
   }
   ```

2. **Create Migration**:
   ```bash
   cd backend-express
   npx prisma migrate dev --name add_new_model
   ```

3. **Use in Code**:
   ```javascript
   const items = await prisma.newModel.findMany({
     where: { userId: req.user.id }
   });
   ```

### Adding an Integration (OAuth)

1. **Create Integration Model** (already exists in `schema.prisma`)
2. **Add OAuth Route** (`backend-express/src/routes/integrations.js`)
3. **Implement OAuth Flow** (see `integrationController.js` for examples)
4. **Store Tokens** in `Integration` model
5. **Implement Token Refresh** logic

---

## Security Best Practices

### Critical Security Rules

1. **NEVER commit secrets**:
   - Use `.env` files (gitignored)
   - Use GCP Secret Manager for production
   - Check `.gitignore` includes all secret files

2. **Always validate user ownership**:
   ```javascript
   // ✅ CORRECT
   const task = await prisma.task.findFirst({
     where: { id: taskId, userId: req.user.id }
   });

   // ❌ WRONG - Missing userId check
   const task = await prisma.task.findUnique({
     where: { id: taskId }
   });
   ```

3. **Use parameterized queries** (Prisma handles this automatically)

4. **Validate all input**:
   ```javascript
   // Use express-validator
   const { body } = require('express-validator');

   router.post('/tasks', [
     body('name').isString().trim().isLength({ min: 1, max: 255 }),
     body('dueDate').optional().isISO8601()
   ], createTask);
   ```

5. **Hash passwords** (use bcrypt):
   ```javascript
   const bcrypt = require('bcrypt');
   const hashedPassword = await bcrypt.hash(password, 10);
   ```

6. **Use HTTPS in production** (Cloud Run enforces this)

7. **Rate limiting** (already configured in `rateLimiter.js`)

8. **CORS configuration** (configured in `server.js`)

### Common Vulnerabilities to Avoid

- **SQL Injection**: Use Prisma (prevents this by default)
- **XSS**: Sanitize user input, use React Native Text (escapes by default)
- **CSRF**: Use SameSite cookies, validate origins
- **Broken Authentication**: Use strong JWT secrets, rotate tokens
- **Sensitive Data Exposure**: Never log passwords/tokens, use HTTPS

---

## Troubleshooting Guide

### Common Issues

#### Backend won't start

```bash
# Check logs
docker-compose logs backend

# Check database connection
docker-compose exec postgres psql -U postgres -d samaanai

# Regenerate Prisma client
cd backend-express
npx prisma generate

# Reset database (DESTRUCTIVE)
npx prisma migrate reset
```

#### Frontend can't connect to backend

```bash
# Verify backend is running
curl http://localhost:8080/health

# Check API_BASE_URL in .env
# For web: http://localhost:8080
# For Android emulator: http://10.0.2.2:8080
# For iOS simulator: http://localhost:8080

# Clear Expo cache
npx expo start -c
```

#### Database migration failed

```bash
# Check migration status
npx prisma migrate status

# Resolve migration issues
npx prisma migrate resolve --applied <migration_name>

# Force reset (DESTRUCTIVE - local dev only)
npx prisma migrate reset
```

#### CI/CD deployment failed

```bash
# View GitHub Actions logs
gh run list
gh run view --log-failed

# Check Cloud Run service
gcloud run services describe samaanai-backend-staging \
  --region us-west1

# Check Cloud Run logs
gcloud run services logs read samaanai-backend-staging \
  --limit=50
```

#### OAuth not working

1. Verify OAuth credentials in GCP Secret Manager
2. Check redirect URIs match exactly
3. Verify scopes are correct
4. Check token expiration and refresh logic

---

## Additional Resources

### Documentation
- [Main README](./README.md) - User-facing setup guide
- [Google Tasks Integration](./GOOGLE_TASKS_INTEGRATION.md) - OAuth setup
- [Production Infrastructure](./PRODUCTION_INFRASTRUCTURE_DOCUMENTATION.md)
- [Staging Infrastructure](./STAGING_INFRASTRUCTURE_DOCUMENTATION.md)

### External Links
- [Expo Documentation](https://docs.expo.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Google Cloud Run](https://cloud.google.com/run/docs)

### Scripts
- `dev.sh` - Start local development environment
- `update-google-oauth.sh` - Update OAuth credentials
- `register-push-token.sh` - Register push notification token

---

## Key Takeaways for AI Assistants

When working on this codebase:

1. **Always filter by `userId`** in database queries for security
2. **Use try/catch** and pass errors to `next(error)` in controllers
3. **Follow conventional commits** (feat:, fix:, etc.)
4. **Push to `staging`** for development, PR to `main` for production
5. **Test locally** with Docker before pushing
6. **Never commit secrets** - use `.env` files and Secret Manager
7. **Run migrations** after schema changes: `npx prisma migrate dev`
8. **Use Prisma types** for type safety
9. **Check existing patterns** before adding new code
10. **Document OAuth flows** and external integrations

### Before Making Changes

- [ ] Read relevant code in the affected modules
- [ ] Understand the existing patterns
- [ ] Test locally with `docker-compose up`
- [ ] Run database migrations if schema changed
- [ ] Commit with conventional commit message
- [ ] Push to `staging` and verify deployment
- [ ] Test in staging environment before promoting to production

---

**Last Updated**: 2025-11-26
**Maintainer**: Krishna Yadamakanti
**Repository**: https://github.com/kittureddy2000/Samaanai_apps
