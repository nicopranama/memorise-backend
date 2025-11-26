import Joi from 'joi';

export const generateFlashcardsSchema = Joi.object({
    fileId: Joi.string().required().messages({
        'string.empty': 'FILE_ID_REQUIRED: File ID is required',
        'any.required': 'FILE_ID_REQUIRED: File ID is required',
    }),
    format: Joi.string().valid('definition', 'question').required().messages({
        'any.only': 'FORMAT_INVALID: Format must be either "definition" or "question"',
        'any.required': 'FORMAT_REQUIRED: Format is required',
    }),
    cardAmount: Joi.number().integer().min(1).max(50).required().messages({
        'number.base': 'CARD_AMOUNT_INVALID: Card amount must be a number',
        'number.integer': 'CARD_AMOUNT_INTEGER: Card amount must be an integer',
        'number.min': 'CARD_AMOUNT_MIN: Card amount must be at least 1',
        'number.max': 'CARD_AMOUNT_MAX: Card amount cannot exceed 50',
        'any.required': 'CARD_AMOUNT_REQUIRED: Card amount is required',
    }),
});

export const draftDeckParamsSchema = Joi.object({
    deckId: Joi.string().required().messages({
        'string.empty': 'DECK_ID_REQUIRED: Deck ID is required',
        'any.required': 'DECK_ID_REQUIRED: Deck ID is required',
    }),
});

export const draftCardParamsSchema = Joi.object({
    deckId: Joi.string().required().messages({
        'string.empty': 'DECK_ID_REQUIRED: Deck ID is required',
        'any.required': 'DECK_ID_REQUIRED: Deck ID is required',
    }),
    cardId: Joi.string().required().messages({
        'string.empty': 'CARD_ID_REQUIRED: Card ID is required',
        'any.required': 'CARD_ID_REQUIRED: Card ID is required',
    }),
});

export const updateDraftCardSchema = Joi.object({
    front: Joi.string().trim().max(2000).optional().messages({
        'string.max': 'FRONT_TOO_LONG: Front side cannot exceed 2000 characters',
    }),
    back: Joi.string().trim().max(2000).optional().messages({
        'string.max': 'BACK_TOO_LONG: Back side cannot exceed 2000 characters',
    }),
}).min(1).messages({
    'object.min': 'UPDATE_DATA_REQUIRED: At least one field (front or back) must be provided',
});

export const saveDraftSchema = Joi.object({
    folderId: Joi.string().allow(null).optional().messages({
        'string.base': 'FOLDER_ID_INVALID: Folder ID must be a string',
    }),
});


