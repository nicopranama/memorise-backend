import Joi from 'joi';

// Common validation patterns
const emailSchema = Joi.string().email().lowercase().trim().required();
const passwordSchema = Joi.string().min(8).max(128).required()
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  });

const nameSchema = Joi.string().min(1).max(50).trim().required()
  .pattern(/^[a-zA-Z\s'-]+$/)
  .messages({
    'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes'
  });

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
  token: Joi.string().required()
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
  token: Joi.string().required(),
  newPassword: passwordSchema
});

// Refresh token validation
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

// Update profile validation
export const updateProfileSchema = Joi.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  profile: Joi.object({
    bio: Joi.string().max(500).allow('').optional(),
    timezone: Joi.string().optional(),
    language: Joi.string().length(2).optional()
  }).optional(),
  preferences: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
    theme: Joi.string().valid('light', 'dark', 'auto').optional()
  }).optional()
});

// Change password validation
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordSchema
});

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Custom validation for password confirmation
export const validatePasswordConfirmation = (req, res, next) => {
  const { password, confirmPassword } = req.body;
  
  if (password && confirmPassword && password !== confirmPassword) {
    return res.status(400).json({
      error: 'Password confirmation does not match'
    });
  }
  
  next();
};

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);

  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

