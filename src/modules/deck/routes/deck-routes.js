import express from 'express';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { validateRequest } from '../../../shared/middleware/validate-request.js';
import {
  createDeck,
  getDecks,
  getDeckById,
  updateDeck,
  moveDeck,
  deleteDeck,
  getDeckStats,
  getOverallStats
} from '../controllers/deck-controller.js';
import {
  createDeckSchema,
  updateDeckSchema,
  moveDeckSchema,
  deckParamsSchema,
  deckQuerySchema
} from '../validators/deck-validators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/decks - Create new deck
router.post(
  '/',
  validateRequest(createDeckSchema),
  createDeck
);

// GET /api/decks - Get all decks for user
router.get(
  '/',
  validateRequest(deckQuerySchema, 'query'),
  getDecks
);

// GET /api/decks/:id - Get deck by ID
router.get(
  '/:id',
  validateRequest(deckParamsSchema, 'params'),
  validateRequest(deckQuerySchema, 'query'),
  getDeckById
);

// PATCH /api/decks/:id - Update deck
router.patch(
  '/:id',
  validateRequest(deckParamsSchema, 'params'),
  validateRequest(updateDeckSchema),
  updateDeck
);

// PATCH /api/decks/:id/move - Move deck to different folder
router.patch(
  '/:id/move',
  validateRequest(deckParamsSchema, 'params'),
  validateRequest(moveDeckSchema),
  moveDeck
);

// DELETE /api/decks/:id - Delete deck
router.delete(
  '/:id',
  validateRequest(deckParamsSchema, 'params'),
  deleteDeck
);

// GET /api/decks/:id/stats - Get deck statistics
router.get(
  '/:id/stats',
  validateRequest(deckParamsSchema, 'params'),
  getDeckStats
);

// GET /api/decks/stats - Get overall statistics
router.get(
  '/stats',
  getOverallStats
);

export default router;
