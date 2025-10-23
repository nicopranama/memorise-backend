import express from 'express';
import {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout
} from '../controllers/auth-controller.js';
import {
  validate,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema
} from '../validators/auth-validators.js';
import { authRateLimit } from '../middleware/auth-rate-limit.js';

const router = express.Router();

// Public routes (no authentication required)

// Register new user
router.post('/register', 
  authRateLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  validate(registerSchema),
  register
);

// Login user
router.post('/login',
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  validate(loginSchema),
  login
);

// Verify email address
router.post('/verify-email',
  validate(verifyEmailSchema),
  verifyEmail
);

// Resend verification email
router.post('/resend-verification',
  authRateLimit(3, 5 * 60 * 1000), // 3 attempts per 5 minutes
  validate(resendVerificationSchema),
  resendVerificationEmail
);

// Forgot password
router.post('/forgot-password',
  authRateLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  validate(forgotPasswordSchema),
  forgotPassword
);

// Reset password
router.post('/reset-password',
  authRateLimit(3, 15 * 60 * 1000), // 3 attempts per 15 minutes
  validate(resetPasswordSchema),
  resetPassword
);

// Refresh access token
router.post('/refresh-token',
  validate(refreshTokenSchema),
  refreshToken
);

// Logout user (public endpoint, mainly for client-side token cleanup)
router.post('/logout', logout);

export default router;

