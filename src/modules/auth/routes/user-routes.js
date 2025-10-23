import express from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getUserStats
} from '../controllers/user-controller.js';
import { authenticate, requireEmailVerification } from '../middleware/index.js';
import {
  validate,
  updateProfileSchema,
  changePasswordSchema
} from '../validators/auth-validators.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// Get current user profile
router.get('/profile', getProfile);

// Update user profile
router.put('/profile',
  validate(updateProfileSchema),
  updateProfile
);

// Get user statistics
router.get('/stats', getUserStats);

// Change password
router.put('/change-password',
  validate(changePasswordSchema),
  changePassword
);

// Delete account
router.delete('/account', deleteAccount);

export default router;

