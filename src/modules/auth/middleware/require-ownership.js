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
