const { PrismaClient } = require('@prisma/client');

// Configure connection pool settings based on environment
const datasourceUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

// Production needs more relaxed settings due to serverless nature
const connectionLimit = isProduction ? 10 : 20;
const poolTimeout = isProduction ? 60 : 30;

// Add connection pool timeout configuration to prevent stale connections
const poolConfig = `connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}&connect_timeout=10`;

// Append pool config to DATABASE_URL if not already present
const databaseUrl = datasourceUrl && !datasourceUrl.includes('connection_limit')
  ? `${datasourceUrl}${datasourceUrl.includes('?') ? '&' : '?'}${poolConfig}`
  : datasourceUrl;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  errorFormat: 'pretty'
});

// Test database connection
prisma.$connect()
  .then(() => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Database connected successfully');
    }
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

// Handle disconnection on app termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = { prisma };