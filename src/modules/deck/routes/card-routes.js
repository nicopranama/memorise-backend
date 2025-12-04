import express from 'express';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { validateRequest } from '../../../shared/middleware/validate-request.js';
import { upload, translateMulterError } from '../../file/middleware/file-upload.js';
import { validateFileType } from '../../file/middleware/validate-file-type.js';
import { handleCardImages } from '../middleware/handle-card-images.js';
import {
  createCard,
  getCardsByDeck,
  getCardById,
  updateCard,
  deleteCard,
  updateCardStatus,
  updateStudyData,
  addCardTag,
  removeCardTag,
  getCardsByStatus,
  bulkUpdateCards,
  bulkDeleteCards
} from '../controllers/card-controller.js';
import {
  createCardSchema,
  updateCardSchema,
  updateCardStatusSchema,
  updateStudyDataSchema,
  addTagSchema,
  cardParamsSchema,
  deckParamsSchema,
  statusParamsSchema,
  tagParamsSchema,
  bulkUpdateSchema,
  bulkDeleteSchema
} from '../validators/card-validators.js';

const router = express.Router();
router.use(authenticate);

// POST /api/cards - Create new card 
router.post(
  '/',
  upload.fields([
    { name: 'imageFront', maxCount: 1 },
    { name: 'imageBack', maxCount: 1 }
  ]),
  translateMulterError,
  validateFileType,
  handleCardImages,
  validateRequest(createCardSchema),
  createCard
);

// GET /api/cards/deck/:deckId - Get all cards in deck
router.get(
  '/deck/:deckId',
  validateRequest(deckParamsSchema, 'params'),
  getCardsByDeck
);

// GET /api/cards/:id - Get card by ID
router.get(
  '/:id',
  validateRequest(cardParamsSchema, 'params'),
  getCardById
);

// PATCH /api/cards/:id - Update card (supports file upload for imageFront and imageBack)
router.patch(
  '/:id',
  validateRequest(cardParamsSchema, 'params'),
  upload.fields([
    { name: 'imageFront', maxCount: 1 },
    { name: 'imageBack', maxCount: 1 }
  ]),
  translateMulterError,
  validateFileType,
  handleCardImages,
  validateRequest(updateCardSchema),
  updateCard
);

// DELETE /api/cards/:id - Delete card
router.delete(
  '/:id',
  validateRequest(cardParamsSchema, 'params'),
  deleteCard
);

// PATCH /api/cards/:id/status - Update card status
router.patch(
  '/:id/status',
  validateRequest(cardParamsSchema, 'params'),
  validateRequest(updateCardStatusSchema),
  updateCardStatus
);

// PATCH /api/cards/:id/study-data - Update card study data
router.patch(
  '/:id/study-data',
  validateRequest(cardParamsSchema, 'params'),
  validateRequest(updateStudyDataSchema),
  updateStudyData
);

// POST /api/cards/:id/tags - Add tag to card
router.post(
  '/:id/tags',
  validateRequest(cardParamsSchema, 'params'),
  validateRequest(addTagSchema),
  addCardTag
);

// DELETE /api/cards/:id/tags/:tag - Remove tag from card
router.delete(
  '/:id/tags/:tag',
  validateRequest(cardParamsSchema, 'params'),
  validateRequest(tagParamsSchema, 'params'),
  removeCardTag
);

// GET /api/cards/deck/:deckId/status/:status - Get cards by status in deck
router.get(
  '/deck/:deckId/status/:status',
  validateRequest(deckParamsSchema, 'params'),
  validateRequest(statusParamsSchema, 'params'),
  getCardsByStatus
);

// PATCH /api/cards/bulk - Bulk update cards
router.patch(
  '/bulk',
  validateRequest(bulkUpdateSchema),
  bulkUpdateCards
);

// DELETE /api/cards/bulk - Bulk delete cards
router.delete(
  '/bulk',
  validateRequest(bulkDeleteSchema),
  bulkDeleteCards
);

export default router;
