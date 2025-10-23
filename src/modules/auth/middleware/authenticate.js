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
    const decoded = verifyToken(token, 'access');
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        error: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account is deactivated'
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        error: 'Account is deleted'
      });
    }

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
