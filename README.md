# Samaanai - Full-Stack Nutrition & Finance Platform

A comprehensive platform combining nutrition tracking, finance management, and task organization built with React Native (Expo), Express.js, and PostgreSQL.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Branching & Deployment Strategy](#branching--deployment-strategy)
- [Mobile App Builds with Expo](#mobile-app-builds-with-expo)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)

---

## Features

### Nutrition Tracking
- Daily calorie and macronutrient tracking (protein, carbs, fat)
- Meal logging by type (breakfast, lunch, dinner, snacks)
- Exercise and activity tracking with calories burned
- Daily nutrition reports and progress monitoring
- Goal setting and achievement tracking

### Task Management
- Create and organize tasks with due dates
- Task completion tracking
- Statistics dashboard
- Image attachments support

### Authentication
- Email/password registration and login
- Google OAuth integration
- JWT-based secure sessions
- Password reset functionality

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │   React Native + Expo Universal                   │  │
│  │   • iOS App (via Expo EAS)                        │  │
│  │   • Android App (via Expo EAS)                    │  │
│  │   • Web App (via Expo for Web)                    │  │
│  │   • Shared codebase for all platforms             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────┘
                  │ REST API (JWT Auth)
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    BACKEND LAYER                         │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Express.js API Server                           │  │
│  │   • Node.js 18+                                   │  │
│  │   • Passport.js (Local + Google OAuth)            │  │
│  │   • JWT Authentication                            │  │
│  │   • Microsoft Graph API Integration               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────────────┘
                  │ Prisma ORM
                  │
┌─────────────────▼───────────────────────────────────────┐
│                    DATABASE LAYER                        │
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │   PostgreSQL Database                             │  │
│  │   • User authentication                           │  │
│  │   • Nutrition data (meals, exercises, goals)      │  │
│  │   • Tasks and todos                               │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### How Expo Fits In

**Expo** is a framework built on top of React Native that enables:

1. **Universal Apps**: Write once, deploy to iOS, Android, and Web
2. **EAS Build**: Cloud-based build service for native apps
3. **Over-the-Air Updates**: Push JavaScript updates without app store approval
4. **Native API Access**: Camera, location, notifications, etc.
5. **Development Tools**: Fast refresh, debugging, and testing

**Why Expo for This Project:**
- **Single Codebase**: The `samaanai-mobile/` directory contains ONE codebase that runs on:
  - iOS devices (via EAS Build)
  - Android devices (via EAS Build)
  - Web browsers (via Expo for Web)
- **Faster Development**: No need to manage Xcode/Android Studio for most features
- **Easy Deployment**: Automated builds via GitHub Actions + EAS CLI
- **Future-Proof**: Can eject to bare React Native if needed

---

## Tech Stack

### Frontend
- **Framework**: React Native with Expo SDK
- **UI Library**: React Native Paper
- **Navigation**: React Navigation
- **State Management**: React Context API
- **HTTP Client**: Axios

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Prisma
- **Authentication**: Passport.js (Local + Google OAuth)
- **Validation**: Joi

### Database
- **Development**: PostgreSQL 15 (Docker)
- **Production**: Cloud SQL PostgreSQL (GCP)

### DevOps & CI/CD
- **Containerization**: Docker
- **Cloud Platform**: Google Cloud Platform
  - Cloud Run (Backend API)
  - Secret Manager (Credentials)
  - Cloud SQL (Database)
  - Artifact Registry (Docker images)
- **CI/CD**: GitHub Actions
- **Mobile Builds**: Expo Application Services (EAS)

---

## Project Structure

```
Samaanai_apps/
├── backend-express/           # Express.js API Server
│   ├── src/
│   │   ├── config/           # App configuration
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # Auth, error handling
│   │   ├── routes/           # API endpoints
│   │   └── server.js         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   ├── migrations/       # Database migrations
│   │   └── seed.js           # Sample data
│   ├── Dockerfile            # Production Docker image
│   └── cloudbuild.yaml       # GCP Cloud Build config
│
├── samaanai-mobile/          # React Native Universal App
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts (Auth, etc.)
│   │   ├── navigation/       # App navigation setup
│   │   ├── screens/          # App screens
│   │   └── services/         # API client
│   ├── app.json             # Expo configuration
│   ├── eas.json             # EAS Build configuration
│   └── package.json
│
├── .github/workflows/        # CI/CD Pipelines
│   ├── backend-staging.yml   # Deploy backend to staging
│   ├── backend-prod.yml      # Deploy backend to production
│   └── mobile-build.yml      # Build mobile apps with EAS
│
├── update-google-oauth.sh   # Update OAuth credentials script
├── docker-compose.yml       # Local development environment
└── README.md               # This file
```

---

## Development Setup

### Prerequisites

- **Docker Desktop** (recommended) OR
- Node.js 18+, PostgreSQL 15+, and npm/yarn

### Quick Start with Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/kittureddy2000/Samaanai_apps.git
cd Samaanai_apps

# Start all services (database, backend, frontend)
docker-compose up -d --build

# Seed sample data
docker-compose exec backend node prisma/seed.js

# Access the application
# Web: http://localhost:19006
# API: http://localhost:8080

# Login credentials
# Email: demo@samaanai.com
# Password: password123
```

### Manual Setup (Alternative)

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

**Frontend:**
```bash
cd samaanai-mobile
cp .env.example .env
npm install
npx expo start --web  # For web
# OR
npx expo start        # Scan QR code for mobile
```

### Development Workflow

```bash
# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Full reset (removes data)
docker-compose down -v

# Execute commands in containers
docker-compose exec backend sh
docker-compose exec postgres psql -U postgres -d samaanai
```

---

## Branching & Deployment Strategy

This project uses a **two-environment strategy** with automated deployments via GitHub Actions.

### Branch Structure

```
main (production) ← Protected: Requires PR
  └─ staging (pre-production) ← Direct push allowed
```

### Environments

| Environment | Branch | GCP Project | Backend URL | Frontend URL | Database |
|------------|--------|-------------|-------------|--------------|----------|
| **Staging** | `staging` | `samaanai-stg-1009-124126` | `samaanai-backend-staging-*.run.app` | `samaanai-frontend-staging-*.run.app` | Cloud SQL Staging |
| **Production** | `main` | `samaanai-prod-1009-124126` | `samaanai-backend-*.run.app` | `samaanai-frontend-*.run.app` | Cloud SQL Production |

### Deployment Flow

**Staging (Direct Push):**
```
┌─────────────────────────────────────────────────────────┐
│  Developer pushes directly to 'staging' branch           │
│  git push origin staging                                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions Workflow Auto-Triggered                  │
│  1. Run tests                                            │
│  2. Build Docker image                                   │
│  3. Push to GCP Artifact Registry                        │
│  4. Deploy to Cloud Run (Staging)                        │
│  5. Run database migrations                              │
│  6. Health check                                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Staging Environment Live                                │
│  • Test new features                                     │
│  • Validate integrations                                 │
│  • QA testing for several days                           │
└─────────────────────────────────────────────────────────┘
```

**Production (Pull Request Required):**
```
┌─────────────────────────────────────────────────────────┐
│  After testing passes in staging                         │
│  Create Pull Request: staging → main                     │
│  gh pr create --base main --head staging                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Pull Request Review                                     │
│  • Review all changes since last production deploy       │
│  • Verify staging tests passed                           │
│  • Add description of what's being released              │
│  • Approve PR (required by branch protection)            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Merge PR → main                                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions Auto-Deploys to Production              │
│  (Same workflow as staging)                              │
└─────────────────────────────────────────────────────────┘
```

### Why This Workflow?

**Staging** (no PR required):
- ✅ Fast iteration and testing
- ✅ No bureaucracy for development work
- ✅ Safe to experiment

**Production** (PR required):
- ✅ Forces review before deploying to users
- ✅ Creates deployment history/audit trail
- ✅ Prevents accidental production pushes
- ✅ Opportunity to write release notes

### Common Commands

**Daily Development (Staging):**
```bash
# Work on staging branch
git checkout staging
git pull origin staging

# Make changes, then push directly
git add .
git commit -m "feat: add dark mode toggle"
git push origin staging        # ← Auto-deploys to staging

# View deployment status
gh run list --branch staging
```

**Production Release (PR Workflow):**
```bash
# After testing staging for a few days, promote to production
git checkout staging
git pull origin staging

# Create Pull Request to main
gh pr create --base main --head staging \
  --title "Production Release - Week of Oct 11" \
  --body "### Changes in this release
- Dark mode toggle
- Bug fixes for nutrition tracking
- Performance improvements

### Testing
- Tested in staging for 3 days
- All automated tests passing
- Manual QA completed"

# Review the PR on GitHub, then merge
# After merge, production deploys automatically

# Verify production deployment
gh run list --branch main
gh run watch
```

**Alternative: Merge via Git (if you prefer command line):**
```bash
# After PR is approved and merged on GitHub
git checkout main
git pull origin main

# Verify it deployed
gcloud run services describe samaanai-backend \
  --region us-central1 \
  --project samaanai-prod-1009-124126
```

**Rollback (Emergency):**
```bash
# If something breaks in production
gcloud run services update samaanai-backend \
  --image gcr.io/samaanai-prod-1009-124126/samaanai-backend:PREVIOUS_SHA \
  --region us-central1 \
  --project samaanai-prod-1009-124126
```

---

## Mobile App Builds with Expo

### Build Profiles

The project includes three build profiles configured in `eas.json`:

**1. Development Profile**
```json
{
  "distribution": "internal",
  "ios": { "simulator": true },
  "android": { "buildType": "apk" }
}
```
- For local testing
- iOS simulator builds (Mac only)
- Android APK (easy to install)

**2. Staging Profile**
```json
{
  "extends": "development",
  "env": {
    "API_BASE_URL": "https://samaanai-backend-staging-*.run.app"
  }
}
```
- Connects to staging backend
- Internal distribution
- For QA and testing

**3. Production Profile**
```json
{
  "env": {
    "API_BASE_URL": "https://samaanai-backend-*.run.app"
  }
}
```
- Connects to production backend
- App Store / Play Store ready
- iOS builds require Apple Developer account
- Android builds as AAB for Play Store

### Automated Mobile Builds

Mobile apps are automatically built when:
- Changes are pushed to `staging` or `main` branches
- Changes detected in `samaanai-mobile/` directory
- Manual trigger via GitHub Actions

**Workflow Process:**
```
1. Detect changes in samaanai-mobile/
2. Authenticate to Expo via EXPO_TOKEN
3. Run EAS Build command
4. Build apps in Expo cloud
5. Artifacts available on expo.dev
```

### Building Manually

```bash
cd samaanai-mobile

# Login to Expo
eas login

# Build for staging
eas build --platform android --profile staging
eas build --platform ios --profile staging

# Build for production
eas build --platform android --profile production
eas build --platform ios --profile production

# View builds
eas build:list

# Download latest build
eas build:download --platform android --latest
```

### Installing Builds

**Android APK (Staging):**
1. Download APK from [expo.dev](https://expo.dev)
2. Transfer to Android device
3. Enable "Install from Unknown Sources"
4. Tap APK to install

**iOS Simulator (Mac only):**
1. Download .tar.gz from expo.dev
2. Extract .app file
3. Drag to iOS Simulator

**Production (App Stores):**
```bash
# Submit to Google Play
eas submit --platform android

# Submit to App Store
eas submit --platform ios
```

---

## Testing

### API Endpoints

**Authentication:**
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `GET /api/v1/auth/google` - Google OAuth login
- `POST /api/v1/auth/refresh` - Refresh access token

**Nutrition:**
- `GET /api/v1/nutrition/meals` - Get user's meals
- `POST /api/v1/nutrition/meals` - Log a meal
- `GET /api/v1/nutrition/exercises` - Get exercises
- `POST /api/v1/nutrition/exercises` - Log exercise
- `GET /api/v1/nutrition/reports/daily` - Daily nutrition report

**Tasks:**
- `GET /api/v1/todo/tasks` - Get all tasks
- `POST /api/v1/todo/tasks` - Create task
- `PATCH /api/v1/todo/tasks/:id` - Update task
- `DELETE /api/v1/todo/tasks/:id` - Delete task

### Testing with curl

```bash
# Health check
curl http://localhost:8080/health

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@samaanai.com","password":"password123"}'

# Get tasks (with JWT token)
curl http://localhost:8080/api/v1/todo/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Running Tests

```bash
# Backend tests
cd backend-express
npm test

# Mobile tests
cd samaanai-mobile
npm test
```

---

## Production Deployment

### Prerequisites

This project is already configured with:
- ✅ GCP projects (staging + production)
- ✅ Cloud SQL databases
- ✅ GitHub repository and secrets
- ✅ CI/CD pipelines via GitHub Actions
- ✅ Branch protection on `main` (requires PR)

### Ongoing Deployments

**Staging (Direct Push):**
```bash
# Deploy to staging - direct push allowed
git checkout staging
git add .
git commit -m "feat: add new feature"
git push origin staging        # ← Triggers auto-deployment

# Monitor deployment
gh run list --branch staging
gh run watch
```

**Production (Pull Request Required):**
```bash
# After staging has been tested for a few days
git checkout staging
git pull origin staging

# Create PR to production
gh pr create --base main --head staging \
  --title "Production Release - [Date]" \
  --body "Summary of changes being released"

# On GitHub:
# 1. Review the PR
# 2. Approve the PR
# 3. Merge the PR

# After merge, GitHub Actions auto-deploys to production
# Monitor deployment
gh run list --branch main
```

**Note:** The `main` branch is protected and requires PR approval. You cannot push directly to `main`.

### Updating Secrets

**Google OAuth credentials:**
```bash
./update-google-oauth.sh
```

**Database URL:**
```bash
gcloud config set project samaanai-stg-1009-124126
echo -n "new-database-url" | gcloud secrets versions add DATABASE_URL --data-file=-
```

**Any other secret:**
```bash
gcloud secrets versions add SECRET_NAME \
  --project=PROJECT_ID \
  --data-file=-
# Then paste the value and press Ctrl+D
```

---

## Environment Variables

### Backend (.env for local dev)

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/samaanai

# JWT
JWT_SECRET=dev-jwt-secret-not-for-production
JWT_REFRESH_SECRET=dev-refresh-secret-not-for-production

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=http://localhost:19006

# Server
PORT=8080
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:19006,http://localhost:3000
```

### Mobile App (.env for local dev)

```bash
API_BASE_URL=http://localhost:8080
```

### Production (GCP Secret Manager)

Secrets are managed in GCP Secret Manager and injected at runtime:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret

---

## Monitoring & Logs

**View Cloud Run logs:**
```bash
# Staging
gcloud run services logs read samaanai-backend-staging \
  --project=samaanai-stg-1009-124126 \
  --limit=50

# Production
gcloud run services logs read samaanai-backend \
  --project=samaanai-prod-1009-124126 \
  --limit=50

# Tail logs
gcloud run services logs tail samaanai-backend-staging \
  --project=samaanai-stg-1009-124126
```

**Connect to Cloud SQL:**
```bash
# Download Cloud SQL Proxy
curl -o cloud-sql-proxy \
  https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.amd64

chmod +x cloud-sql-proxy

# Connect to staging database
./cloud-sql-proxy samaanai-stg-1009-124126:us-central1:samaanai-staging-db --port 5433

# In another terminal
psql "postgresql://postgres:PASSWORD@localhost:5433/samaanai_staging"
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Check database connection
docker-compose exec postgres psql -U postgres -d samaanai

# Regenerate Prisma client
docker-compose exec backend npx prisma generate

# Reset database
docker-compose exec backend npx prisma migrate reset
```

### Frontend can't connect to backend
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

### Deployment fails
```bash
# Check GitHub Actions logs
gh run list
gh run view --log-failed

# Check GCP service
gcloud run services describe samaanai-backend-staging \
  --region us-central1 \
  --project samaanai-stg-1009-124126

# Check secrets
gcloud secrets list --project samaanai-stg-1009-124126
```

### Mobile build fails
```bash
# Check Expo build status
eas build:list

# View build logs
eas build:view BUILD_ID

# Verify EXPO_TOKEN is set in GitHub Secrets
gh secret list
```

---

## License

MIT License

## Author

Krishna Yadamakanti

---

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [React Native](https://reactnative.dev/)
- [Express.js](https://expressjs.com/)
- [Prisma](https://www.prisma.io/)
- [Google Cloud Run](https://cloud.google.com/run)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/)
