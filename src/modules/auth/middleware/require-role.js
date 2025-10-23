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
