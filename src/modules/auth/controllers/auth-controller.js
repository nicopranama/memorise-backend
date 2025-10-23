import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { successResponse, createdResponse } from '../../../shared/utils/response-utils.js';
import * as AuthService from '../services/auth-service.js';


/**
 * Register new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
    const { user, tokens } = await AuthService.registerUser(req.body);
    return createdResponse(res, 'User registered successfully.Please check your email to verify your account', {
        user,
        tokens
    });
});

/**
 * Verify email address
 * POST /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(async(req, res) => {
    await AuthService.verifyUserEmailByToken(req.body.token);
    return successResponse(res, 200, { message: 'Email verified successfully' });
});

/**
 * Resend email verification
 * POST /api/auth/resend-verification
 */
export const resendVerificationEmail = asyncHandler(async (req, res) => {
    await AuthService.resendVerificationEmailService(req.body.email);
    return successResponse(res, 200, { message: 'If your email is not verified, a new verification link has been sent' });
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { user, tokens } = await AuthService.loginUser(req.body);
  return successResponse(res, 200, {
    message: 'Login successful.',
    data: {
      user, 
      tokens
    }
  });
});

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { user, tokens } = await AuthService.refreshAccessTokenService(req.body.refreshToken);
  return successResponse(res, 200, {
    message: 'Token refreshed successfully.',
    data: { user, tokens } 
  });
});

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  await AuthService.requestPasswordResetService(req.body.email);
  return successResponse(res, 200, {
    message: 'If an account with that email exists, a password reset link has been sent.'
  });
});

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  await AuthService.resetPasswordService(req.body.token, req.body.newPassword);
  return successResponse(res, 200, { message: 'Password reset successful.' });
});

/**
 * Logout user (stateless)
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (_req, res) => {
  return successResponse(res, 200, { message: 'Logout successful.' });
});



