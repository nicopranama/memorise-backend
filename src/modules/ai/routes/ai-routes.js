import express from 'express';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { validateRequest } from '../../../shared/middleware/validate-request.js';
import {
    generateFlashcards,
    getDraftDeck,
    updateDraftCard,
    deleteDraftCard,
    deleteAllDraftCards,
    saveDraftDeck,
} from '../controllers/ai-controller.js';
import {
    generateFlashcardsSchema,
    draftDeckParamsSchema,
    draftCardParamsSchema,
    updateDraftCardSchema,
    saveDraftSchema,
} from '../validators/ai-validators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/ai/generate-flashcards - Generate flashcards from file
router.post(
    '/generate-flashcards',
    validateRequest(generateFlashcardsSchema),
    generateFlashcards
);

// GET /api/ai/draft/:deckId - Get draft deck with cards
router.get(
    '/draft/:deckId',
    validateRequest(draftDeckParamsSchema, 'params'),
    getDraftDeck
);

// PATCH /api/ai/draft/:deckId/cards/:cardId - Update card in draft deck
router.patch(
    '/draft/:deckId/cards/:cardId',
    validateRequest(draftCardParamsSchema, 'params'),
    validateRequest(updateDraftCardSchema),
    updateDraftCard
);

// DELETE /api/ai/draft/:deckId/cards/:cardId - Delete card from draft deck
router.delete(
    '/draft/:deckId/cards/:cardId',
    validateRequest(draftCardParamsSchema, 'params'),
    deleteDraftCard
);

// DELETE /api/ai/draft/:deckId/cards - Delete all cards from draft deck
router.delete(
    '/draft/:deckId/cards',
    validateRequest(draftDeckParamsSchema, 'params'),
    deleteAllDraftCards
);

// POST /api/ai/draft/:deckId/save - Save draft deck as final deck
router.post(
    '/draft/:deckId/save',
    validateRequest(draftDeckParamsSchema, 'params'),
    validateRequest(saveDraftSchema),
    saveDraftDeck
);

export default router;


