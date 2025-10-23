import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { successResponse } from '../../../shared/utils/response-utils.js';
import * as UserService from '../services/user-service.js';

/**
 * GET /api/users/profile
 * Get current user profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  const user = await UserService.getUserProfile(req.user._id);
  return successResponse(res, 200, { user });
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await UserService.updateUserProfile(req.user._id, req.body);
  return successResponse(res, 200, {
    message: 'Profile updated successfully',
    user: updatedUser,
  });
});

/**
 * PUT /api/users/change-password
 * Change password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await UserService.changeUserPassword(req.user._id, currentPassword, newPassword);
  return successResponse(res, 200, { message: 'Password changed successfully' });
});

/**
 * DELETE /api/users/account
 * Soft delete user account
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  await UserService.deleteUserAccount(req.user._id, password);
  return successResponse(res, 200, { message: 'Account deleted successfully' });
});

/**
 * GET /api/users/stats
 * Get user statistics
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await UserService.getUserStatsService(req.user._id);
  return successResponse(res, 200, { stats });
});
