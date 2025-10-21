import User from '../models/user-model.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Get current user profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        isEmailVerified: user.isEmailVerified,
        profile: user.profile,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;

    // Update allowed fields
    const allowedUpdates = ['firstName', 'lastName', 'profile', 'preferences'];
    const updateData = {};

    for (const field of allowedUpdates) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    logger.info(`Profile updated for user: ${user.email}`);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        fullName: updatedUser.fullName,
        isEmailVerified: updatedUser.isEmailVerified,
        profile: updatedUser.profile,
        preferences: updatedUser.preferences,
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Change password
 */
export const changePassword = async (req, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Delete user account (soft delete)
 */
export const deleteAccount = async (req, res) => {
  try {
    const user = req.user;
    const { password } = req.body;

    // Verify password before deletion
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        error: 'Password is incorrect'
      });
    }

    // Soft delete user
    await user.softDelete();

    logger.info(`Account deleted for user: ${user.email}`);

    res.json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (req, res) => {
  try {
    const user = req.user;

    // This is a placeholder for future statistics
    // You can extend this based on your app's features
    const stats = {
      accountCreated: user.createdAt,
      lastLogin: user.lastLogin,
      emailVerified: user.isEmailVerified,
      // Add more stats as needed:
      // totalDecks: 0,
      // totalCards: 0,
      // studyStreak: 0,
      // etc.
    };

    res.json({
      stats
    });

  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

