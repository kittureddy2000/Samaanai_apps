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
  const maxRequests = 100;

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

module.exports = rateLimiter;