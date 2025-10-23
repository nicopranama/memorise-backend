import { verifyToken } from '../services/token-service.js';
import User from '../models/user-model.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      logger.warn('Invalid token in optional auth:', tokenError.message);
    }

    next();

  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};
