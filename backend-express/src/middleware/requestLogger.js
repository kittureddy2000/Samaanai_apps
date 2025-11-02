/**
 * HTTP request logging middleware
 * Logs all incoming requests with timing and response info
 */

const pinoHttp = require('pino-http');
const logger = require('../config/logger');

const requestLogger = pinoHttp({
  logger,

  // Custom log level based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    } else if (res.statusCode >= 400) {
      return 'warn';
    } else if (res.statusCode >= 300) {
      return 'info';
    }
    return 'info';
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },

  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },

  // Add custom attributes to the log
  customAttributeKeys: {
    responseTime: 'responseTime',
    req: 'request',
    res: 'response',
    err: 'error'
  },

  // Don't log health checks in production to reduce noise
  autoLogging: {
    ignore: (req) => {
      if (process.env.NODE_ENV === 'production' && req.url === '/health') {
        return true;
      }
      return false;
    }
  }
});

module.exports = requestLogger;
