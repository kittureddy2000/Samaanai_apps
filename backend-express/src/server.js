require('dotenv').config();

// Validate environment variables before proceeding
const { validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const passport = require('./config/passport');

// Routes
const authRoutes = require('./routes/auth');
const nutritionRoutes = require('./routes/nutrition');
const todoRoutes = require('./routes/todo');
const userRoutes = require('./routes/user');
const emailTestRoutes = require('./routes/emailTest');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 8080;

// Security & Performance Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration with dynamic origin validation
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowlist
    if (allowedOrigins.length === 0) {
      // Development fallback: allow all origins but warn
      console.warn('⚠️  ALLOWED_ORIGINS not set - allowing all origins in development mode');
      return callback(null, origin);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }

    // Reject unauthorized origins
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // Cache preflight for 24 hours
}));

app.use(compression());

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport initialization
app.use(passport.initialize());

// Rate limiting (apply to all routes)
app.use(rateLimiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Samaanai API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      todo: '/api/v1/todo',
      nutrition: '/api/v1/nutrition',
      user: '/api/v1/user'
    },
    documentation: 'https://github.com/kittureddy2000/Samaanai_apps'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/nutrition', nutritionRoutes);
app.use('/api/v1/todo', todoRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/test', emailTestRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Received shutdown signal, closing server...');
  const { prisma } = require('./config/database');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Samaanai API running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);

    // Initialize scheduled jobs
    const { initializeScheduler } = require('./services/schedulerService');
    initializeScheduler();
  });
}

module.exports = app;