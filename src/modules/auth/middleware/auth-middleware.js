import { verifyToken } from '../services/token-service.js';
import User from '../models/user-model.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Middleware to authenticate JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Access token required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token, 'access');

    // Find user
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account is deactivated'
      });
    }

    // Check if user is deleted
    if (user.isDeleted) {
      return res.status(403).json({
        error: 'Account is deleted'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }

    res.status(500).json({
      error: 'Internal server error during authentication'
    });
  }
};

/**
 * Middleware to check if email is verified
 */
export const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      requiresVerification: true
    });
  }
  next();
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token, 'access');
      const user = await User.findById(decoded.sub);
      
      if (user && user.isActive && !user.isDeleted) {
        req.user = user;
      }
    } catch (tokenError) {
      // Token is invalid, but we continue without authentication
      logger.warn('Invalid token in optional auth:', tokenError.message);
    }

    next();

  } catch (error) {
    logger.error('Optional authentication error:', error);
    // Continue without authentication even if there's an error
    next();
  }
};

/**
 * Middleware to check user roles (for future role-based access)
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // For now, we don't have roles implemented
    // This is a placeholder for future role-based access control
    // You can extend the User model to include roles
    
    next();
  };
};

/**
 * Middleware to check if user owns the resource
 */
export const requireOwnership = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    
    if (req.user._id.toString() !== resourceUserId) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own resources.'
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware for auth endpoints
 */
export const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const identifier = req.ip + ':' + (req.body.email || 'unknown');
    const now = Date.now();
    
    // Clean old entries
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
      // Reset window
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

