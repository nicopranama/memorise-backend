import Joi from 'joi';
import { asyncHandler } from './async-handler.js';
import { logger } from '../utils/logger.js';

export const validateRequest = (schema, source = 'body') => {
  return asyncHandler(async (req, res, next) => {
    try {
      const dataToValidate = source === 'params' ? req.params : 
                           source === 'query' ? req.query : 
                           req.body;

      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        logger.warn(`Validation error for ${req.method} ${req.originalUrl}:`, errorMessages);

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages
        });
      }

      if (source === 'body') {
        req.body = value;
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during validation'
      });
    }
  });
};

