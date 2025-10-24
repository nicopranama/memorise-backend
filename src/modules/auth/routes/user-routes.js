import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getUserStats,
  checkPasswordStrength,
  getEmailVerificationStatus
} from '../controllers/user-controller.js';
import { authenticate, requireEmailVerification, optionalAuth } from '../middleware/index.js';
import {
  validate,
  updateProfileSchema,
  changePasswordSchema,
  checkPasswordStrengthSchema
} from '../validators/auth-validators.js';

const router = express.Router();

// Check password strength (public endpoint - no auth required)
router.post('/check-password-strength', 
  optionalAuth, 
  validate(checkPasswordStrengthSchema),
  checkPasswordStrength
);
// All user routes require authentication
router.use(authenticate);

// Check email verification status
router.get('/email-verification-status', getEmailVerificationStatus);

// Get current user profile
router.get('/profile', 
  requireEmailVerification,
  getProfile
);

// Update user profile
router.put('/profile',
  requireEmailVerification, 
  validate(updateProfileSchema),
  updateProfile
);

// Get user statistics
router.get('/stats', 
  requireEmailVerification, 
  getUserStats
);

// Change password
router.put('/change-password',
  requireEmailVerification, 
  validate(changePasswordSchema),
  changePassword
);

// Delete account
router.delete('/account', 
  requireEmailVerification, 
  deleteAccount
);

export default router;

