import Joi from 'joi';

export const createFolderSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Folder name is required',
      'string.min': 'Folder name must be at least 1 character long',
      'string.max': 'Folder name must not exceed 100 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  color: Joi.string()
    .pattern(/^#[0-9A-F]{6}$/i)
    .optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #3B82F6)'
    })
});

export const updateFolderSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Folder name must be at least 1 character long',
      'string.max': 'Folder name must not exceed 100 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  color: Joi.string()
    .pattern(/^#[0-9A-F]{6}$/i)
    .optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color code (e.g., #3B82F6)'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const folderParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid folder ID format'
    })
});
