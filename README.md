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

This project includes automated CI/CD deployment to **staging** and **production** environments via GitHub Actions.

### Deployment Strategy

```
Push to 'staging' branch  →  Auto-deploy to Staging Environment
Push to 'main' branch     →  Auto-deploy to Production Environment
```

### 🤖 Automated Setup (Recommended)

Run these scripts to set up everything automatically:

```bash
# 1. Create GCP projects, enable APIs, create service accounts
./setup-gcp-environments.sh

# 2. Create PostgreSQL databases for staging and production
./setup-cloud-sql.sh

# 3. Create GitHub repository and add secrets
./setup-github-repo.sh

# 4. Deploy to staging
git checkout -b staging
git push -u origin staging
```

The automated scripts handle:
- ✅ Creates separate GCP projects for staging and production
- ✅ Enables required APIs (Cloud Run, Cloud Build, Secret Manager, Cloud SQL)
- ✅ Creates service accounts with proper IAM roles
- ✅ Generates secure JWT secrets
- ✅ Creates Cloud SQL PostgreSQL databases
- ✅ Sets up GitHub repository and secrets
- ✅ Configures CI/CD pipeline

### Quick Deploy (After Initial Setup)

```bash
# Make your changes
git add .
git commit -m "feat: your feature description"

# Deploy to staging
git push origin staging

# Deploy to production
git push origin main

# GitHub Actions automatically:
# 1. Runs tests
# 2. Builds Docker image
# 3. Deploys to Cloud Run
# 4. Runs database migrations
# 5. Performs health check
```

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for detailed deployment instructions and troubleshooting.

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
