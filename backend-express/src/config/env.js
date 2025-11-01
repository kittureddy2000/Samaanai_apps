/**
 * Environment variable validation
 * Ensures critical secrets are set before app starts
 */

const requiredEnvVars = {
  production: [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET'
  ],
  staging: [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL'
  ],
  development: [
    // Relaxed requirements for local dev
  ]
};

/**
 * Validate required environment variables
 * Fails fast with clear error messages if critical vars are missing
 */
const validateEnv = () => {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || requiredEnvVars.development;

  const missing = [];
  const warnings = [];

  // Check required variables
  for (const varName of required) {
    if (!process.env[varName] || process.env[varName].trim() === '') {
      missing.push(varName);
    }
  }

  // Check for insecure defaults
  if (process.env.JWT_SECRET === 'your-secret-key-here' ||
      process.env.JWT_SECRET === 'default' ||
      process.env.JWT_SECRET === 'secret') {
    warnings.push('JWT_SECRET is set to a default/insecure value');
  }

  if (process.env.JWT_REFRESH_SECRET === 'your-refresh-secret-key-here' ||
      process.env.JWT_REFRESH_SECRET === 'default') {
    warnings.push('JWT_REFRESH_SECRET is set to a default/insecure value');
  }

  // Report findings
  if (missing.length > 0) {
    console.error('\n❌ CRITICAL: Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Set these in your .env file or environment before starting the server.\n');

    if (env === 'production' || env === 'staging') {
      console.error('🚨 Cannot start server in production/staging without required secrets.\n');
      process.exit(1);
    } else {
      console.warn('⚠️  Development mode: Allowing startup with missing vars (NOT SAFE FOR PRODUCTION)\n');
    }
  }

  if (warnings.length > 0 && (env === 'production' || env === 'staging')) {
    console.error('\n⚠️  SECURITY WARNINGS:');
    warnings.forEach(warning => {
      console.error(`   - ${warning}`);
    });
    console.error('\n🚨 Cannot start server with insecure secrets in production/staging.\n');
    process.exit(1);
  }

  // Success
  if (missing.length === 0 && warnings.length === 0) {
    console.log('✅ Environment validation passed');
  }
};

module.exports = { validateEnv };
