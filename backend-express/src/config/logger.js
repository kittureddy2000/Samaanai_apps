/**
 * Structured logging with Pino
 * Replaces console.log with proper structured logs for production
 */

const pino = require('pino');

// Configure logger based on environment
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Pretty print in development, JSON in production
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: false
    }
  } : undefined,

  // Base context included in all logs
  base: {
    env: process.env.NODE_ENV,
    service: 'samaanai-backend'
  },

  // Custom serializers for common objects
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      params: req.params,
      query: req.query,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      },
      // Don't log authorization header for security
      userId: req.user?.id,
      ip: req.ip
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders()
    }),
    err: pino.stdSerializers.err
  },

  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'password', 'token', 'accessToken', 'refreshToken'],
    remove: true
  }
});

/**
 * Create child logger with context
 * Usage: const log = logger.child({ userId: '123', requestId: 'abc' })
 */
logger.createLogger = (context) => {
  return logger.child(context);
};

/**
 * Log levels:
 * - trace (10): Very detailed debugging
 * - debug (20): Debugging information
 * - info (30): Informational messages
 * - warn (40): Warning messages
 * - error (50): Error messages
 * - fatal (60): Fatal errors (app crash)
 */

module.exports = logger;
