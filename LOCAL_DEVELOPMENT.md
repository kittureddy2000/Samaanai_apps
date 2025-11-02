# Local Development Guide

Quick guide to test your changes locally with Docker before committing to staging.

## 🚀 Quick Start

### First Time Setup

```bash
# Make sure Docker Desktop is running
# Then:

./dev.sh start
```

This will:
- ✅ Build all Docker containers
- ✅ Start PostgreSQL database
- ✅ Start backend API server
- ✅ Start frontend web server
- ✅ Run database migrations

**Access your local app:**
- Frontend: http://localhost:19006
- Backend API: http://localhost:8080
- Database: localhost:5432

### Daily Development

```bash
# Start services (faster, no rebuild)
./dev.sh quick

# Make your code changes in src/ directories
# Changes are auto-reloaded via volumes!

# View logs
./dev.sh logs

# Stop when done
./dev.sh stop
```

## 📝 Common Commands

| Command | Description |
|---------|-------------|
| `./dev.sh start` | Full start (build + migrate) |
| `./dev.sh quick` | Quick start (no rebuild) |
| `./dev.sh stop` | Stop all services |
| `./dev.sh restart` | Restart services |
| `./dev.sh logs` | View all logs (live) |
| `./dev.sh test` | Run backend tests |
| `./dev.sh migrate` | Run new migrations |
| `./dev.sh status` | Check service status |

## 🔄 Typical Workflow

### Making Backend Changes

```bash
# Start services
./dev.sh quick

# Edit files in backend-express/src/
# Changes auto-reload! Watch the logs:
./dev.sh backend-logs

# Test your API
curl http://localhost:8080/api/v1/health

# Run tests
./dev.sh test

# If migrations needed
./dev.sh migrate

# Stop when done
./dev.sh stop
```

### Making Frontend Changes

```bash
# Start services
./dev.sh quick

# Edit files in samaanai-mobile/src/
# Open browser: http://localhost:19006
# Changes auto-reload!

# Watch logs
./dev.sh frontend-logs

# Stop when done
./dev.sh stop
```

## 🧪 Testing Flow

```bash
# 1. Start local environment
./dev.sh start

# 2. Make your changes
# ... edit code ...

# 3. Test locally
# - Open http://localhost:19006
# - Test features manually
# - Run automated tests: ./dev.sh test

# 4. If everything works, commit
git add .
git commit -m "feat: your feature"

# 5. Push to staging (auto-deploys)
git push origin staging

# 6. Stop local environment
./dev.sh stop
```

## 🗄️ Database

### Access Database

```bash
# Open PostgreSQL shell
./dev.sh shell-db

# Then run SQL:
\dt                          # List tables
SELECT * FROM "User";        # Query users
\q                           # Quit
```

### Run Migrations

```bash
# After creating a new migration
./dev.sh migrate

# Or manually
docker-compose exec backend npx prisma migrate dev --name your_migration_name
```

### Reset Database

```bash
# WARNING: Deletes all data!
./dev.sh clean
./dev.sh start
```

## 🐛 Troubleshooting

### Containers won't start

```bash
# Check what's running
docker ps -a

# Clean up everything
./dev.sh clean

# Start fresh
./dev.sh start
```

### Port already in use

```bash
# Check what's using ports
lsof -i :8080   # Backend
lsof -i :19006  # Frontend
lsof -i :5432   # Database

# Kill the process or stop Docker
./dev.sh stop
```

### Changes not reflecting

```bash
# For backend: restart
./dev.sh restart

# For frontend: hard reload browser
# Or rebuild:
./dev.sh rebuild
```

### Database issues

```bash
# Check database logs
docker-compose logs postgres

# Reset database
./dev.sh clean
./dev.sh start
```

## 🔍 Advanced

### Access Container Shell

```bash
# Backend container
./dev.sh shell-backend

# Database container
./dev.sh shell-db
```

### Custom Docker Commands

```bash
# View all containers
docker-compose ps

# Restart specific service
docker-compose restart backend

# View service logs
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend npm run <command>
```

### Environment Variables

Local environment uses `.env.development` file:
- Database: `samaanai_dev`
- User: `postgres`
- Password: `devpassword123`
- JWT secrets are dev-only (not secure!)

**Never commit `.env` files with real credentials!**

## 📊 Service Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (React Native Web)            │
│  http://localhost:19006                 │
│                                         │
│  Auto-reload on changes ✨              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Backend (Express.js)                   │
│  http://localhost:8080                  │
│                                         │
│  Auto-reload with nodemon ✨            │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  PostgreSQL Database                    │
│  localhost:5432                         │
│                                         │
│  Data persisted in Docker volume        │
└─────────────────────────────────────────┘
```

## 🎯 Why Test Locally?

1. **Fast Feedback** - See changes in seconds, not minutes
2. **No CI/CD Wait** - Don't wait for GitHub Actions
3. **Full Stack** - Test frontend + backend + database together
4. **Debugging** - Use debuggers, add console.logs freely
5. **Offline** - Works without internet
6. **Safe** - Don't break staging while experimenting

## ✅ Best Practices

1. **Always test locally first** before pushing to staging
2. **Use `./dev.sh quick`** for daily work (faster)
3. **Run `./dev.sh test`** before committing
4. **Clean up** with `./dev.sh stop` when done
5. **Rebuild** with `./dev.sh rebuild` if things get weird

## 🚀 Next Steps

Once tested locally and everything works:

```bash
# Commit your changes
git add .
git commit -m "feat: your awesome feature"

# Push to staging (auto-deploys!)
git push origin staging

# Monitor deployment
gh run watch --exit-status
```

Happy coding! 🎉
