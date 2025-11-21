import Joi from 'joi';

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID format');

export const idParamSchema = Joi.object({
  id: objectId.required()
});


export const uploadSchema = Joi.object({
  refModel: Joi.string().trim().valid('Deck', 'Card', 'User', 'Profile', 'Folder').optional(),
  refId: Joi.when('refModel', {
    is: Joi.exist(),
    then: objectId.required(),
    otherwise: Joi.optional()
  }),
  
  idempotencyKey: Joi.string().trim().optional(),
  metadata: Joi.string().optional() 
});


export const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  ownerType: Joi.string().valid('user', 'system').optional(),
  refModel: Joi.string().trim().optional(),
  refId: objectId.optional()
});


export const urlQuerySchema = Joi.object({
  expiresIn: Joi.number().integer().min(60).max(604800).default(3600) // 1 jam default
});


export const bulkDeleteSchema = Joi.object({
  ids: Joi.array()
    .items(objectId)
    .min(1)
    .required()
});


export const updateSchema = Joi.object({
  isPublic: Joi.boolean(),
  metadata: Joi.object().pattern(Joi.string(), Joi.any()),
  refModel: Joi.string().trim().optional(),
  refId: objectId.optional()
}).min(1);