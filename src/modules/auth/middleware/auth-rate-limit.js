/**
 * Rate limiting middleware for auth endpoints
 */
export const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const identifier = req.ip + ':' + (req.body.email || 'unknown');
    const now = Date.now();
    
    for (const [key, data] of attempts.entries()) {
      if (now - data.firstAttempt > windowMs) {
        attempts.delete(key);
      }
    }

    const userAttempts = attempts.get(identifier);
    
    if (!userAttempts) {
      attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
      return next();
    }

    if (now - userAttempts.firstAttempt > windowMs) {
      attempts.set(identifier, {
        count: 1,
        firstAttempt: now
      });
      return next();
    }

    if (userAttempts.count >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil((userAttempts.firstAttempt + windowMs - now) / 1000)
      });
    }

    userAttempts.count++;
    next();
  };
};
