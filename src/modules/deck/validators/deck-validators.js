import Joi from 'joi';

export const createDeckSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Deck name is required',
      'string.min': 'Deck name must be at least 1 character long',
      'string.max': 'Deck name must not exceed 100 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  folderId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid folder ID format'
    }),
  isDraft: Joi.boolean()
    .optional()
    .default(false)
});

export const updateDeckSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Deck name must be at least 1 character long',
      'string.max': 'Deck name must not exceed 100 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  folderId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid folder ID format'
    }),
  settings: Joi.object({
    studyMode: Joi.string()
      .valid('normal', 'spaced_repetition')
      .optional(),
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .optional()
  }).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const moveDeckSchema = Joi.object({
  folderId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .allow(null)
    .required()
    .messages({
      'string.pattern.base': 'Invalid folder ID format',
      'any.required': 'Folder ID is required'
    })
});

export const deckParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid deck ID format'
    })
});

export const deckQuerySchema = Joi.object({
  folderId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid folder ID format'
    }),
  unassigned: Joi.string()
    .valid('true', 'false')
    .optional(),
  isDraft: Joi.string()
    .valid('true', 'false')
    .optional(),
  include: Joi.string()
    .optional()
    .messages({
      'string.base': 'Include parameter must be a string'
    })
});
