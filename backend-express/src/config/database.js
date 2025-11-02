const { PrismaClient } = require('@prisma/client');

// Configure connection pool settings
const datasourceUrl = process.env.DATABASE_URL;
const poolConfig = 'connection_limit=20&pool_timeout=30';

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