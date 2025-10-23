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
