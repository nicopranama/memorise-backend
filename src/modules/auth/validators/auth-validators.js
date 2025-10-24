import Joi from 'joi';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  optionalNameSchema,
  bioSchema,
  timezoneSchema,
  languageSchema,
  themeSchema,
  booleanSchema,
  tokenSchema,
  refreshTokenSchema,
  validate,
  validatePasswordConfirmation,
  validateEmail,
  validatePasswordStrength
} from './common.js';

// Registration validation
export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema
});

// Login validation
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required()
});

// Email verification validation
export const verifyEmailSchema = Joi.object({
  token: tokenSchema
});

// Resend verification email validation
export const resendVerificationSchema = Joi.object({
  email: emailSchema
});

// Forgot password validation
export const forgotPasswordSchema = Joi.object({
  email: emailSchema
});

// Reset password validation
export const resetPasswordSchema = Joi.object({
  token: tokenSchema,
  newPassword: passwordSchema
});

// Refresh token validation
export const refreshTokensSchema = Joi.object({
  refreshToken: refreshTokenSchema
});

// Update profile validation
export const updateProfileSchema = Joi.object({
  firstName: optionalNameSchema,
  lastName: optionalNameSchema,
  profile: Joi.object({
    bio: bioSchema,
    timezone: timezoneSchema,
    language: languageSchema
  }).optional(),
  preferences: Joi.object({
    emailNotifications: booleanSchema,
    pushNotifications: booleanSchema,
    theme: themeSchema
  }).optional()
});

// Change password validation
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema
});

// Check password strength validation
export const checkPasswordStrengthSchema = Joi.object({
  password: Joi.string().required()
});

// Re-export common validators for convenience
export {
  validate,
  validatePasswordConfirmation,
  validateEmail,
  validatePasswordStrength
} from './common.js';

