// Simple in-memory rate limiter
// In production, use Redis-based solution like express-rate-limit with Redis store

const rateLimit = {};

const rateLimiter = (req, res, next) => {
  // Skip rate limiting in test and development environments
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return next();
  }

  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 1000; // Increased for mobile app usage

  if (!rateLimit[ip]) {
    rateLimit[ip] = {
      count: 1,
      resetTime: now + windowMs
    };
    return next();
  }

  // Reset if window has passed
  if (now > rateLimit[ip].resetTime) {
    rateLimit[ip] = {
      count: 1,
      resetTime: now + windowMs
    };
    return next();
  }

  // Increment count
  rateLimit[ip].count++;

  // Check if limit exceeded
  if (rateLimit[ip].count > maxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((rateLimit[ip].resetTime - now) / 1000)
    });
  }

  next();
};

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimit).forEach(ip => {
    if (now > rateLimit[ip].resetTime + 3600000) {
      delete rateLimit[ip];
    }
  });
}, 3600000);

/**
 * Strict rate limiter for authentication endpoints
 * Helps prevent brute force attacks on login/register
 */
const createAuthLimiter = () => {
  const authRateLimit = {};

  return (req, res, next) => {
    // Skip rate limiting in test environments only
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10; // Only 10 login attempts per 15 minutes

    if (!authRateLimit[ip]) {
      authRateLimit[ip] = {
        count: 1,
        resetTime: now + windowMs,
        firstAttempt: now
      };
      return next();
    }

    // Reset if window has passed
    if (now > authRateLimit[ip].resetTime) {
      authRateLimit[ip] = {
        count: 1,
        resetTime: now + windowMs,
        firstAttempt: now
      };
      return next();
    }

    // Increment count
    authRateLimit[ip].count++;

    // Check if limit exceeded
    if (authRateLimit[ip].count > maxAttempts) {
      const retryAfter = Math.ceil((authRateLimit[ip].resetTime - now) / 1000);
      console.warn(`⚠️  Login rate limit exceeded for IP: ${ip} (${authRateLimit[ip].count} attempts)`);

      return res.status(429).json({
        error: 'Too many login attempts. Please try again later.',
        retryAfter,
        message: `Please wait ${Math.ceil(retryAfter / 60)} minutes before trying again.`
      });
    }

    next();
  };
};

module.exports = rateLimiter;
module.exports.authLimiter = createAuthLimiter();