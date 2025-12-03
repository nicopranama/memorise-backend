import Joi from 'joi';

export const createCardSchema = Joi.object({
  deckId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid deck ID format',
      'any.required': 'Deck ID is required'
    }),
  front: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Front side is required',
      'string.min': 'Front side must be at least 1 character long',
      'string.max': 'Front side must not exceed 2000 characters'
    }),
  back: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Back side is required',
      'string.min': 'Back side must be at least 1 character long',
      'string.max': 'Back side must not exceed 2000 characters'
    }),
  imageFront: Joi.alternatives()
    .try(
      Joi.string().uri().allow(''),
      Joi.string().pattern(/^\/api\/files\/[0-9a-fA-F]{24}$/).allow('')
    )
    .optional()
    .messages({
      'alternatives.match': 'Front image must be a valid URL or file endpoint'
    }),
  imageBack: Joi.alternatives()
    .try(
      Joi.string().uri().allow(''),
      Joi.string().pattern(/^\/api\/files\/[0-9a-fA-F]{24}$/).allow('')
    )
    .optional()
    .messages({
      'alternatives.match': 'Back image must be a valid URL or file endpoint'
    }),
  notes: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Notes must not exceed 1000 characters'
    }),
  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(50)
        .messages({
          'string.min': 'Tag must be at least 1 character long',
          'string.max': 'Tag must not exceed 50 characters'
        })
    )
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 tags allowed'
    })
});

export const updateCardSchema = Joi.object({
  front: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .optional()
    .messages({
      'string.min': 'Front side must be at least 1 character long',
      'string.max': 'Front side must not exceed 2000 characters'
    }),
  back: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .optional()
    .messages({
      'string.min': 'Back side must be at least 1 character long',
      'string.max': 'Back side must not exceed 2000 characters'
    }),
  imageFront: Joi.alternatives()
    .try(
      Joi.string().uri().allow(''),
      Joi.string().pattern(/^\/api\/files\/[0-9a-fA-F]{24}$/).allow('')
    )
    .optional()
    .messages({
      'alternatives.match': 'Front image must be a valid URL or file endpoint'
    }),
  imageBack: Joi.alternatives()
    .try(
      Joi.string().uri().allow(''),
      Joi.string().pattern(/^\/api\/files\/[0-9a-fA-F]{24}$/).allow('')
    )
    .optional()
    .messages({
      'alternatives.match': 'Back image must be a valid URL or file endpoint'
    }),
  notes: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Notes must not exceed 1000 characters'
    }),
  tags: Joi.array()
    .items(
      Joi.string()
        .trim()
        .min(1)
        .max(50)
        .messages({
          'string.min': 'Tag must be at least 1 character long',
          'string.max': 'Tag must not exceed 50 characters'
        })
    )
    .max(10)
    .optional()
    .messages({
      'array.max': 'Maximum 10 tags allowed'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const updateCardStatusSchema = Joi.object({
  status: Joi.string()
    .valid('not_studied', 'learning', 'mastered')
    .required()
    .messages({
      'any.required': 'Status is required',
      'any.only': 'Status must be one of: not_studied, learning, mastered'
    })
});

export const updateStudyDataSchema = Joi.object({
  timesStudied: Joi.number()
    .integer()
    .min(0)
    .optional(),
  lastStudied: Joi.date()
    .optional(),
  nextReview: Joi.date()
    .optional(),
  easeFactor: Joi.number()
    .min(1.3)
    .max(2.5)
    .optional(),
  interval: Joi.number()
    .integer()
    .min(1)
    .optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const addTagSchema = Joi.object({
  tag: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Tag is required',
      'string.min': 'Tag must be at least 1 character long',
      'string.max': 'Tag must not exceed 50 characters'
    })
});

export const cardParamsSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid card ID format'
    })
});

export const deckParamsSchema = Joi.object({
  deckId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid deck ID format'
    })
});

export const statusParamsSchema = Joi.object({
  status: Joi.string()
    .valid('not_studied', 'learning', 'mastered')
    .required()
    .messages({
      'any.only': 'Status must be one of: not_studied, learning, mastered'
    })
});

export const tagParamsSchema = Joi.object({
  tag: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Tag is required',
      'string.min': 'Tag must be at least 1 character long',
      'string.max': 'Tag must not exceed 50 characters'
    })
});

export const bulkUpdateSchema = Joi.object({
  cardIds: Joi.array()
    .items(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          'string.pattern.base': 'Invalid card ID format'
        })
    )
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one card ID is required',
      'array.max': 'Maximum 100 cards can be updated at once'
    }),
  updateData: Joi.object({
    status: Joi.string()
      .valid('not_studied', 'learning', 'mastered')
      .optional(),
    tags: Joi.array()
      .items(
        Joi.string()
          .trim()
          .min(1)
          .max(50)
      )
      .max(10)
      .optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
});

export const bulkDeleteSchema = Joi.object({
  cardIds: Joi.array()
    .items(
      Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
          'string.pattern.base': 'Invalid card ID format'
        })
    )
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one card ID is required',
      'array.max': 'Maximum 100 cards can be deleted at once'
    })
});
