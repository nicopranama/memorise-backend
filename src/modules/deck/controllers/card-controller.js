import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { successResponse, createdResponse } from '../../../shared/utils/response-utils.js';
import * as CardService from '../services/card-service.js';

/**
 * Create new card
 * POST /api/cards
 */
export const createCard = asyncHandler(async (req, res) => {
  const { deckId, front, back, imageFront, imageBack, notes, tags } = req.body;
  const userId = req.user.id;

  const card = await CardService.createCard({
    front,
    back,
    deckId,
    userId,
    imageFront,
    imageBack,
    notes,
    tags
  });

  return createdResponse(res, 'Card created successfully', card);
});

/**
 * Get all cards in deck
 * GET /api/cards/deck/:deckId
 */
export const getCardsByDeck = asyncHandler(async (req, res) => {
  const { deckId } = req.params;
  const userId = req.user.id;

  const cards = await CardService.getCardsByDeck(deckId, userId);

  return successResponse(res, 200, { data: cards });
});

/**
 * Get card by ID
 * GET /api/cards/:id
 */
export const getCardById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const card = await CardService.getCardById(id, userId);

  return successResponse(res, 200, { data: card });
});

/**
 * Update card
 * PATCH /api/cards/:id
 */
export const updateCard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = req.body;

  const card = await CardService.updateCard(id, userId, updateData);

  return successResponse(res, 200, { data: card });
});

/**
 * Delete card
 * DELETE /api/cards/:id
 */
export const deleteCard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = await CardService.deleteCard(id, userId);

  return successResponse(res, 200, result);
});

/**
 * Update card status
 * PATCH /api/cards/:id/status
 */
export const updateCardStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const card = await CardService.updateCardStatus(id, userId, status);

  return successResponse(res, 200, { data: card });
});

/**
 * Update card study data
 * PATCH /api/cards/:id/study-data
 */
export const updateStudyData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const studyData = req.body;
  const userId = req.user.id;

  const card = await CardService.updateStudyData(id, userId, studyData);

  return successResponse(res, 200, { data: card });
});

/**
 * Add tag to card
 * POST /api/cards/:id/tags
 */
export const addCardTag = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tag } = req.body;
  const userId = req.user.id;

  const card = await CardService.addCardTag(id, userId, tag);

  return successResponse(res, 200, { data: card });
});

/**
 * Remove tag from card
 * DELETE /api/cards/:id/tags/:tag
 */
export const removeCardTag = asyncHandler(async (req, res) => {
  const { id, tag } = req.params;
  const userId = req.user.id;

  const card = await CardService.removeCardTag(id, userId, tag);

  return successResponse(res, 200, { data: card });
});

/**
 * Get card statistics for deck
 * GET /api/cards/deck/:deckId/stats
 */
export const getCardStats = asyncHandler(async (req, res) => {
  const { deckId } = req.params;
  const userId = req.user.id;

  const stats = await CardService.getCardStats(deckId, userId);

  return successResponse(res, 200, { data: stats });
});

/**
 * Get cards by status in deck
 * GET /api/cards/deck/:deckId/status/:status
 */
export const getCardsByStatus = asyncHandler(async (req, res) => {
  const { deckId, status } = req.params;
  const userId = req.user.id;

  const cards = await CardService.getCardsByStatus(deckId, userId, status);

  return successResponse(res, 200, { data: cards });
});

/**
 * Bulk update cards
 * PATCH /api/cards/bulk
 */
export const bulkUpdateCards = asyncHandler(async (req, res) => {
  const { cardIds, updateData } = req.body;
  const userId = req.user.id;

  const result = await CardService.bulkUpdateCards(cardIds, userId, updateData);

  return successResponse(res, 200, result);
});

/**
 * Bulk delete cards
 * DELETE /api/cards/bulk
 */
export const bulkDeleteCards = asyncHandler(async (req, res) => {
  const { cardIds } = req.body;
  const userId = req.user.id;

  const result = await CardService.bulkDeleteCards(cardIds, userId);

  return successResponse(res, 200, result);
});
