import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { successResponse, createdResponse } from '../../../shared/utils/response-utils.js';
import flashcardAIService from '../services/flashcard-ai-service.js';
import * as DeckService from '../../deck/services/deck-service.js';
import * as CardService from '../../deck/services/card-service.js';
import Deck from '../../deck/models/deck-model.js';
import Card from '../../deck/models/card-model.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Generate flashcards from uploaded file
 * POST /api/ai/generate-flashcards
 */
export const generateFlashcards = asyncHandler(async (req, res) => {
    const { fileId, format, cardAmount } = req.body;
    const userId = req.user.id;

    const { deckTitle, cards } = await flashcardAIService.generateFlashcardsFromFile(
        fileId,
        userId,
        format,
        cardAmount
    );

    const deck = await DeckService.createDeck({
        name: deckTitle,
        description: `AI generated deck from document (${format} format)`,
        folderId: null,
        userId,
        isDraft: true,
    });

    const createdCards = await Promise.all(
        cards.map(card =>
            CardService.createCard({
                front: card.front,
                back: card.back,
                deckId: deck._id,
                userId,
            })
        )
    );

    logger.info(`Generated ${createdCards.length} flashcards in draft deck ${deck._id} for user ${userId}`);

    return createdResponse(res, 'Flashcards generated successfully', {
        deck: {
            id: deck._id,
            name: deck.name,
            description: deck.description,
            isDraft: deck.isDraft,
            createdAt: deck.createdAt,
        },
        cards: createdCards.map(card => ({
            id: card._id,
            front: card.front,
            back: card.back,
        })),
    });
});

/**
 * Get draft deck with cards
 * GET /api/ai/draft/:deckId
 */
export const getDraftDeck = asyncHandler(async (req, res) => {
    const { deckId } = req.params;
    const userId = req.user.id;

    const deck = await DeckService.getDeckById(deckId, userId, ['cards']);

    if (!deck.isDraft) {
        throw new Error('NOT_DRAFT_DECK: This deck is not a draft');
    }

    return successResponse(res, 200, { data: deck });
});

/**
 * Update card in draft deck
 * PATCH /api/ai/draft/:deckId/cards/:cardId
 */
export const updateDraftCard = asyncHandler(async (req, res) => {
    const { deckId, cardId } = req.params;
    const userId = req.user.id;
    const { front, back } = req.body;

    const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
    if (!deck) {
        throw new Error('DECK_NOT_FOUND: Deck not found');
    }
    if (!deck.isDraft) {
        throw new Error('NOT_DRAFT_DECK: This deck is not a draft');
    }

    const card = await Card.findOne({ _id: cardId, deckId, userId, isDeleted: false });
    if (!card) {
        throw new Error('CARD_NOT_FOUND: Card not found in this deck');
    }

    const updateData = {};
    if (front !== undefined) updateData.front = front;
    if (back !== undefined) updateData.back = back;

    const updatedCard = await CardService.updateCard(cardId, userId, updateData);

    return successResponse(res, 200, {
        message: 'Card updated successfully',
        data: updatedCard,
    });
});

/**
 * Delete card from draft deck
 * DELETE /api/ai/draft/:deckId/cards/:cardId
 */
export const deleteDraftCard = asyncHandler(async (req, res) => {
    const { deckId, cardId } = req.params;
    const userId = req.user.id;

    const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
    if (!deck) {
        throw new Error('DECK_NOT_FOUND: Deck not found');
    }
    if (!deck.isDraft) {
        throw new Error('NOT_DRAFT_DECK: This deck is not a draft');
    }

    const card = await Card.findOne({ _id: cardId, deckId, userId, isDeleted: false });
    if (!card) {
        throw new Error('CARD_NOT_FOUND: Card not found in this deck');
    }

    await CardService.deleteCard(cardId, userId);

    return successResponse(res, 200, { message: 'Card deleted successfully' });
});

/**
 * Delete all cards from draft deck
 * DELETE /api/ai/draft/:deckId/cards
 */
export const deleteAllDraftCards = asyncHandler(async (req, res) => {
    const { deckId } = req.params;
    const userId = req.user.id;

    const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
    if (!deck) {
        throw new Error('DECK_NOT_FOUND: Deck not found');
    }
    if (!deck.isDraft) {
        throw new Error('NOT_DRAFT_DECK: This deck is not a draft');
    }

    const cards = await Card.find({ deckId, userId, isDeleted: false });
    const cardIds = cards.map(card => card._id);

    if (cardIds.length > 0) {
        await CardService.bulkDeleteCards(cardIds, userId);
    }

    return successResponse(res, 200, {
        message: 'All cards deleted successfully',
        deletedCount: cardIds.length,
    });
});

/**
 * Save draft deck as final deck
 * POST /api/ai/draft/:deckId/save
 */
export const saveDraftDeck = asyncHandler(async (req, res) => {
    const { deckId } = req.params;
    const { folderId } = req.body;
    const userId = req.user.id;

    const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
    if (!deck) {
        throw new Error('DECK_NOT_FOUND: Deck not found');
    }
    if (!deck.isDraft) {
        throw new Error('NOT_DRAFT_DECK: This deck is not a draft');
    }

    const cards = await Card.find({ deckId, userId, isDeleted: false });
    if (cards.length === 0) {
        throw new Error('NO_CARDS_IN_DECK: Cannot save deck without cards');
    }

    const updateData = { isDraft: false };
    if (folderId !== undefined) {
        updateData.folderId = folderId;
    }

    const savedDeck = await DeckService.updateDeck(deckId, userId, updateData);

    logger.info(`Draft deck ${deckId} saved as final deck for user ${userId}`);

    return successResponse(res, 200, {
        message: 'Deck saved successfully',
        data: savedDeck,
    });
});


