# Testing Guide - Samaanai

Complete guide for testing your Samaanai application locally.

## Quick Start

```bash
# Start development environment
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

## Prerequisites

### Docker Desktop (Recommended)
- Docker Desktop installed and running
- 4GB RAM allocated to Docker
- 20GB disk space available

### Manual Setup (Alternative)
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Running the Application

### Option 1: Docker Desktop (Recommended)

**Easiest way - simulates production environment**

```bash
# Start all services (database, backend, frontend)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Full reset (removes data)
docker-compose down -v
```

**What you get:**
- ✅ PostgreSQL database (port 5432)
- ✅ Express.js backend (port 8080)
- ✅ React Native web (port 19006)
- ✅ Hot reload enabled
- ✅ Sample data loaded

### Option 2: Manual Setup

**Backend:**
```bash
cd backend-express

# First time setup
cp .env.example .env
# Edit .env with your database credentials

npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

**Frontend:**
```bash
cd samaanai-mobile

npm install
npm run web        # Web browser
npm run android    # Android emulator
npm run ios        # iOS simulator (Mac only)
```

## Testing the Application

### 1. Health Check

```bash
# Backend health check
curl http://localhost:8080/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":123}
```

### 2. Login Flow

**Using curl:**
```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@samaanai.com","password":"password123"}'

# Save the accessToken from response
```

**Using the web app:**
1. Open http://localhost:19006
2. Enter email: `demo@samaanai.com`
3. Enter password: `password123`
4. Click "Login"
5. Should redirect to Dashboard

### 3. Finance Features

**Dashboard API:**
```bash
curl http://localhost:8080/api/v1/finance/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected data:**
- Net worth: ~$18,750
- 3 accounts (Checking, Savings, Credit Card)
- Recent transactions
- Spending by category

**In the app:**
- Navigate to Finance tab
- View accounts list
- Check transactions
- Review spending analytics

### 4. Nutrition Features

**Daily Report API:**
```bash
curl "http://localhost:8080/api/v1/nutrition/reports/daily?date=2025-09-30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected data:**
- Meals for the day
- Calorie breakdown
- Exercise entries
- Weight tracking

**In the app:**
- Navigate to Nutrition tab
- View meal entries
- Check calorie reports
- Log new meals

### 5. Responsive Design

**Test different screen sizes:**

1. **Mobile (390px)**
   - Open browser DevTools (F12)
   - Toggle device toolbar
   - Select iPhone 13
   - Verify mobile layout

2. **Tablet (768px)**
   - Select iPad
   - Verify tablet layout

3. **Desktop (1920px)**
   - Disable device toolbar
   - Maximize browser
   - Verify desktop layout

## Testing Checklist

### Backend
- [ ] Health endpoint responds
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Dashboard returns data
- [ ] Finance APIs work
- [ ] Nutrition APIs work
- [ ] Token refresh works
- [ ] Error handling works

### Frontend
- [ ] Login screen loads
- [ ] Can login successfully
- [ ] Dashboard shows data
- [ ] Finance tab works
- [ ] Nutrition tab works
- [ ] Profile tab works
- [ ] Navigation works
- [ ] Pull-to-refresh works
- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop

### Data Verification
- [ ] Sample user exists
- [ ] 3 demo accounts present
- [ ] 30 days of transactions
- [ ] 7 days of meal data
- [ ] Net worth snapshots exist
- [ ] Spending categories loaded

## Sample Data

After running `docker-compose exec backend node prisma/seed.js`:

**User:**
- Email: demo@samaanai.com
- Password: password123

**Accounts:**
- Checking: $5,420.50
- Savings: $15,000.00
- Credit Card: -$1,250.30 (liability)
- Net Worth: ~$18,750

**Transactions:**
- 30 days of sample transactions
- Various categories (Groceries, Transport, Utilities, etc.)
- Mix of income and expenses

**Nutrition:**
- 7 days of meal entries
- Exercise tracking
- Weight entries
- Calorie reports

## API Testing Tools

### Using curl

```bash
# Register
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# Get transactions
curl http://localhost:8080/api/v1/plaid/transactions \
  -H "Authorization: Bearer TOKEN"

# Create meal
curl -X POST http://localhost:8080/api/v1/nutrition/meals \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mealType":"breakfast","description":"Oatmeal","calories":300}'
```

### Using Postman/Thunder Client

1. Import collection (create if needed)
2. Set base URL: `http://localhost:8080`
3. Configure authorization with Bearer token
4. Test all endpoints

## Troubleshooting

### Backend Issues

**Database connection failed:**
```bash
# Check PostgreSQL is running
docker-compose ps

# Check database logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

**Port already in use:**
```bash
# Find and kill process
lsof -ti:8080 | xargs kill -9

# Or use different port in .env
PORT=8081
```

**Prisma errors:**
```bash
# Regenerate client
docker-compose exec backend npx prisma generate

# Reset database
docker-compose exec backend npx prisma migrate reset
docker-compose exec backend node prisma/seed.js
```

### Frontend Issues

**Can't connect to backend:**
```bash
# Verify backend is running
curl http://localhost:8080/health

# Check API_BASE_URL in samaanai-mobile/.env
# For web: http://localhost:8080
# For Android emulator: http://10.0.2.2:8080
# For iOS simulator: http://localhost:8080
```

**White screen / app won't load:**
```bash
# Clear cache
npx expo start -c

# Full reset
rm -rf node_modules
npm install
npx expo start -c
```

**Changes not reflecting:**
```bash
# Backend: Check nodemon is running
docker-compose logs backend | grep "restart"

# Frontend: Hard refresh browser
# Or restart Expo: Ctrl+C then npm run web
```

### Docker Issues

**Out of memory:**
```bash
# Increase Docker Desktop memory allocation
# Settings → Resources → Memory (4GB minimum)

# Or prune unused resources
docker system prune -a
```

**Services not starting:**
```bash
# Check Docker Desktop is running
docker --version

# View detailed logs
docker-compose logs

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

## Development Workflow

### Making Backend Changes

1. Edit files in `backend-express/src/`
2. Backend auto-reloads (nodemon)
3. Check logs: `docker-compose logs -f backend`
4. Test endpoint with curl or browser

### Making Frontend Changes

1. Edit files in `samaanai-mobile/src/`
2. Frontend hot-reloads automatically
3. Refresh browser if needed
4. Check browser console for errors

### Database Changes

```bash
# Edit schema
nano backend-express/prisma/schema.prisma

# Create migration
docker-compose exec backend npx prisma migrate dev --name your_change

# Reset if needed
docker-compose exec backend npx prisma migrate reset
docker-compose exec backend node prisma/seed.js
```

## Performance Testing

### Response Times

```bash
# Test API response time
time curl http://localhost:8080/health

# Should be < 100ms
```

### Load Testing (Optional)

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:8080/health
```

## Useful Commands

```bash
# View running containers
docker-compose ps

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend

# Restart a service
docker-compose restart backend

# Execute command in container
docker-compose exec backend sh
docker-compose exec postgres psql -U postgres -d samaanai

# Run Prisma Studio (database GUI)
docker-compose exec backend npx prisma studio
# Access at: http://localhost:5555

# Database backup
docker-compose exec postgres pg_dump -U postgres samaanai > backup.sql

# Database restore
docker-compose exec -T postgres psql -U postgres samaanai < backup.sql
```

## Success Criteria

You know everything is working when:

1. ✅ `docker-compose ps` shows 3 healthy services
2. ✅ http://localhost:8080/health returns OK
3. ✅ http://localhost:19006 shows login screen
4. ✅ Can login with demo credentials
5. ✅ Dashboard shows financial and nutrition data
6. ✅ All tabs are accessible
7. ✅ Code changes reflect immediately
8. ✅ No errors in browser console
9. ✅ No errors in backend logs

## Next Steps

After testing locally:

1. **Production Testing** - See DEPLOYMENT.md for testing production builds
2. **Feature Development** - Start building new features
3. **Deployment** - Deploy to cloud when ready

## Additional Resources

- **API Documentation**: Check backend controllers for endpoint details
- **Database Schema**: `backend-express/prisma/schema.prisma`
- **Frontend Components**: `samaanai-mobile/src/screens/`
- **Docker Guide**: For more Docker-specific help
- **Deployment Guide**: For production deployment steps
