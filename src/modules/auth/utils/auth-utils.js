import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { jwtConfig } from '../../../config/jwt.js';

/**
 * Generate verification link for email verification
 */
export const generateVerificationLink = (token, baseUrl = process.env.FRONTEND_URL) => {
  const base = baseUrl ? baseUrl.replace(/\/$/, '') : '';
  return `${base}/verify.html?token=${token}`;
};

/**
 * Generate reset link for password reset
 */
export const generateResetLink = (token, baseUrl = process.env.FRONTEND_URL) => {
  const base = baseUrl ? baseUrl.replace(/\/$/, '') : '';
  return `${base}/reset-password.html?token=${token}`;
};

/**
 * Generate random token for password reset
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate email verification token
 */
export const generateEmailVerificationToken = (userId) => {
  return jwt.sign(
    {
      userId,
      type: 'email_verification',
      iss: jwtConfig.issuer,
      aud: jwtConfig.audience,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: jwtConfig.verifyEmailExpiration }
  );
};

/**
 * Parse JWT token without verification (for debugging)
 */
export const parseTokenUnsafe = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token) => {
  const decoded = parseTokenUnsafe(token);
  if (!decoded || !decoded.exp) return true;
  
  return Date.now() >= decoded.exp * 1000;
};

/**
 * Get token expiration time in human readable format
 */
export const getTokenExpirationTime = (token) => {
  const decoded = parseTokenUnsafe(token);
  if (!decoded || !decoded.exp) return null;
  
  const expirationDate = new Date(decoded.exp * 1000);
  return expirationDate.toLocaleString();
};

/**
 * Generate idempotency key for email operations
 */
export const generateIdempotencyKey = (operation, userId, timestamp = Date.now()) => {
  return `${operation}_${userId}_${timestamp}`;
};

/**
 * Sanitize user data for public response
 */
export const sanitizeUserData = (user) => {
  if (!user) return null;
  
  const sanitized = { ...user };
  
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.emailVerificationToken;
  delete sanitized.passwordResetToken;
  delete sanitized.passwordResetExpires;
  delete sanitized.loginAttempts;
  delete sanitized.lockUntil;
  delete sanitized.isDeleted;
  delete sanitized.deletedAt;
  
  return sanitized;
};

/**
 * Check if user account is locked
 */
export const isAccountLocked = (user) => {
  return !!(user.lockUntil && user.lockUntil > Date.now());
};

/**
 * Calculate lock expiration time
 */
export const getLockExpirationTime = (lockUntil) => {
  if (!lockUntil) return null;
  
  const expirationDate = new Date(lockUntil);
  return expirationDate.toLocaleString();
};

/**
 * Generate secure random string
 */
export const generateSecureRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash sensitive data for logging (partial masking)
 */
export const maskSensitiveData = (data, visibleChars = 4) => {
  if (!data || data.length <= visibleChars) return '***';
  
  const visible = data.substring(0, visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);
  
  return visible + masked;
};

/**
 * Format error message for auth operations
 */
export const formatAuthError = (operation, details = '') => {
  const timestamp = new Date().toISOString();
  return `AUTH_${operation.toUpperCase()}: ${details} [${timestamp}]`;
};

/**
 * Validate token format (basic check)
 */
export const isValidTokenFormat = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Extract user ID from token (unsafe, for logging only)
 */
export const extractUserIdFromToken = (token) => {
  const decoded = parseTokenUnsafe(token);
  return decoded?.sub || decoded?.userId || null;
};
