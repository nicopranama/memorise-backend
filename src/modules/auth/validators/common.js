import Joi from 'joi';

export const emailSchema = Joi.string().email().lowercase().trim().required();

export const passwordSchema = Joi.string().min(8).max(128).required()
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  });

export const nameSchema = Joi.string().min(1).max(50).trim().required()
  .pattern(/^[a-zA-Z\s'-]+$/)
  .messages({
    'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes'
  });

export const optionalNameSchema = Joi.string().min(1).max(50).trim().optional()
  .pattern(/^[a-zA-Z\s'-]+$/)
  .messages({
    'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes'
  });

export const bioSchema = Joi.string().max(500).allow('').optional();
export const timezoneSchema = Joi.string().optional();
export const languageSchema = Joi.string().length(2).optional();
export const themeSchema = Joi.string().valid('light', 'dark', 'auto').optional();
export const booleanSchema = Joi.boolean().optional();
export const tokenSchema = Joi.string().required();
export const refreshTokenSchema = Joi.string().required();

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

    req.body = value;
    next();
  };
};

export const validatePasswordConfirmation = (req, res, next) => {
  const { password, confirmPassword } = req.body;
  
  if (password && confirmPassword && password !== confirmPassword) {
    return res.status(400).json({
      error: 'Password confirmation does not match'
    });
  }
  
  next();
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

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
