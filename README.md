# 🥗 Samaanai - Nutrition & Task Management App

A full-stack nutrition tracking and task management application built with React Native (Expo), Express.js, and PostgreSQL. Deploy to Google Cloud Run with automated CI/CD.

## ✨ Features

### 🍎 Nutrition Tracking
- Daily calorie and macronutrient tracking (protein, carbs, fat)
- Meal logging by type (breakfast, lunch, dinner, snacks)
- Exercise and activity tracking with calories burned
- Daily nutrition reports and progress monitoring
- Goal setting and achievement tracking

### ✅ Task Management  
- Create and organize tasks with descriptions
- Due dates and reminder settings
- Task completion tracking
- Statistics dashboard (total, completed, overdue)
- Image attachments for tasks

### 🔐 Authentication
- Email/password registration and login
- Google OAuth integration
- JWT-based secure sessions
- Password reset functionality

## 🏗️ Architecture

```
┌──────────────────────────────────┐
│   Mobile/Web Frontend             │
│   React Native + Expo             │
│   iOS • Android • Web             │
└───────────┬──────────────────────┘
            │ REST API (JWT Auth)
            ▼
┌──────────────────────────────────┐
│   Express.js Backend              │
│   Node.js 18 + Passport.js        │
└───────────┬──────────────────────┘
            │ Prisma ORM
            ▼
┌──────────────────────────────────┐
│   PostgreSQL Database             │
│   Users, Nutrition, Tasks         │
└──────────────────────────────────┘
```

## 🚀 Quick Start

### With Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/Samaanai_apps.git
cd Samaanai_apps

# Start all services
docker-compose up --build

# Access the application
# Web: http://localhost:8081
# API: http://localhost:8080
```

### Manual Setup

**Prerequisites:** Node.js 18+, PostgreSQL

```bash
# Backend setup
cd backend-express
cp .env.example .env
# Edit .env with your configuration
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Mobile app setup (new terminal)
cd samaanai-mobile
cp .env.example .env
npm install
npx expo start --web
```

## 📁 Project Structure

```
Samaanai_apps/
├── backend-express/           # Express.js API
│   ├── src/
│   │   ├── config/           # App configuration
│   │   ├── controllers/      # Route controllers
│   │   ├── middleware/       # Auth, error handling
│   │   ├── routes/           # API endpoints
│   │   └── server.js         # Entry point
│   ├── prisma/               # Database schema & migrations
│   └── Dockerfile            # Production image
├── samaanai-mobile/          # React Native app
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts
│   │   ├── navigation/       # App navigation
│   │   ├── screens/          # App screens
│   │   └── services/         # API client
│   └── app.json             # Expo config
├── .github/workflows/        # CI/CD pipelines
└── docker-compose.yml        # Local development
```

## 🔧 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/samaanai

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8080/api/v1/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=http://localhost:8081

# Optional
SENDGRID_API_KEY=your-sendgrid-key  # For email notifications
```

### Mobile (.env)

```env
API_BASE_URL=http://localhost:8080
```

## 🚢 Deployment to Google Cloud Run

### Quick Start

This project includes automated CI/CD deployment to **staging** and **production** environments via GitHub Actions.

### 🤖 Automated Setup (Recommended)

**Run the automated setup script to configure everything in ~10 minutes:**

```bash
./setup-gcp-environments.sh
```

**📖 Automated Setup Guide:** See [`AUTOMATED_SETUP_GUIDE.md`](./AUTOMATED_SETUP_GUIDE.md) for instructions.

This script automates ~80% of the setup work:
- Creates GCP projects
- Enables APIs
- Creates service accounts
- Generates secrets
- Downloads keys for GitHub

### 📖 Manual Setup (Alternative)

**📖 Staging & Production Setup:** See [`STAGING_PRODUCTION_SETUP.md`](./STAGING_PRODUCTION_SETUP.md) for manual step-by-step guide.

**📖 Initial Setup Guide:** See [`GITHUB_SETUP.md`](./GITHUB_SETUP.md) for single-environment setup.

**✅ Deployment Checklist:** See [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) for quick reference.

### Deployment Strategy

```
Push to 'staging' branch  →  Auto-deploy to Staging Environment
Push to 'main' branch     →  Auto-deploy to Production Environment
Manual trigger            →  Choose environment
```

### Quick Deploy (After Initial Setup)

```bash
# Make your changes
git add .
git commit -m "feat: your feature description"
git push origin main

# GitHub Actions automatically:
# 1. Runs tests
# 2. Builds Docker image
# 3. Deploys to Cloud Run
# 4. Runs database migrations
# 5. Performs health check
```

### First-Time Setup Summary

1. **Create GCP Project & Enable APIs**
   ```bash
   gcloud projects create samaanai-prod --name="Samaanai Production"
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
   ```

2. **Create Service Account & Download Key**
   ```bash
   gcloud iam service-accounts create github-actions --display-name="GitHub Actions"
   # Grant IAM roles (see GITHUB_SETUP.md for details)
   gcloud iam service-accounts keys create github-actions-key.json \
     --iam-account=github-actions@PROJECT_ID.iam.gserviceaccount.com
   ```

3. **Create Secrets in Secret Manager**
   ```bash
   echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-
   echo -n "$(openssl rand -base64 32)" | gcloud secrets create JWT_SECRET --data-file=-
   # See GITHUB_SETUP.md for complete list
   ```

4. **Configure GitHub Secrets**
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add: `GCP_PROJECT_ID` and `GCP_SA_KEY`

5. **Push to Deploy**
   ```bash
   git push origin main
   ```

For complete step-by-step instructions, see [`GITHUB_SETUP.md`](./GITHUB_SETUP.md).

## 📱 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with email/password
- `GET /api/v1/auth/google` - Google OAuth login
- `POST /api/v1/auth/refresh` - Refresh access token

### Nutrition
- `GET /api/v1/nutrition/meals` - Get user's meals
- `POST /api/v1/nutrition/meals` - Log a meal
- `GET /api/v1/nutrition/exercises` - Get exercises
- `POST /api/v1/nutrition/exercises` - Log exercise
- `GET /api/v1/nutrition/reports/daily` - Daily nutrition report

### Tasks
- `GET /api/v1/todo/tasks` - Get all tasks
- `POST /api/v1/todo/tasks` - Create task
- `PATCH /api/v1/todo/tasks/:id` - Update task
- `DELETE /api/v1/todo/tasks/:id` - Delete task
- `GET /api/v1/todo/tasks/stats` - Task statistics

### User
- `GET /api/v1/user/profile` - Get user profile
- `PATCH /api/v1/user/profile` - Update profile

## 🧪 Testing

```bash
# Backend tests
cd backend-express
npm test

# Mobile tests
cd samaanai-mobile
npm test
```

## 🛠️ Tech Stack

- **Backend**: Node.js 18, Express.js, Prisma ORM, PostgreSQL
- **Frontend**: React Native, Expo, React Native Paper
- **Auth**: Passport.js (Local + Google OAuth), JWT
- **DevOps**: Docker, GitHub Actions, Google Cloud Run
- **Database**: PostgreSQL with Prisma migrations

## 📄 License

MIT License - see LICENSE file

## 👤 Author

Krishna Yadamakanti

## 🙏 Acknowledgments

- React Native & Expo teams
- Prisma ORM
- Google Cloud Platform
