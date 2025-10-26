import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { successResponse, createdResponse } from '../../../shared/utils/response-utils.js';
import * as DeckService from '../services/deck-service.js';
import Folder from '../models/folder-model.js';
import Deck from '../models/deck-model.js';
import Card from '../models/card-model.js';

/**
 * Create new deck
 * POST /api/decks
 */
export const createDeck = asyncHandler(async (req, res) => {
  const { name, description, folderId, isDraft } = req.body;
  const userId = req.user.id;

  const deck = await DeckService.createDeck({
    name,
    description,
    folderId,
    userId,
    isDraft
  });

  return createdResponse(res, 'Deck created successfully', deck);
});

/**
 * Get all decks for user
 * GET /api/decks
 */
export const getDecks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const filters = req.query;

  const decks = await DeckService.getDecksByUser(userId, filters);

  return successResponse(res, 200, { data: decks });
});

/**
 * Get deck by ID
 * GET /api/decks/:id?include=cards,stats
 */
export const getDeckById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { include } = req.query;
  const userId = req.user.id;

  const includeArray = include ? include.split(',').map(item => item.trim()) : [];
  const deck = await DeckService.getDeckById(id, userId, includeArray);

  return successResponse(res, 200, { data: deck });
});

/**
 * Update deck
 * PATCH /api/decks/:id
 */
export const updateDeck = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = req.body;

  const deck = await DeckService.updateDeck(id, userId, updateData);

  return successResponse(res, 200, { data: deck });
});

/**
 * Move deck to different folder
 * PATCH /api/decks/:id/move
 */
export const moveDeck = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { folderId } = req.body;
  const userId = req.user.id;

  const deck = await DeckService.moveDeck(id, userId, folderId);

  return successResponse(res, 200, { data: deck });
});

/**
 * Delete deck
 * DELETE /api/decks/:id
 */
export const deleteDeck = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = await DeckService.deleteDeck(id, userId);

  return successResponse(res, 200, result);
});

/**
 * Get deck statistics
 * GET /api/decks/:id/stats
 */
export const getDeckStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const stats = await DeckService.getDeckStats(id, userId);

  return successResponse(res, 200, { data: stats });
});

/**
 * Get home data (folders and unassigned decks)
 * GET /api/home
 */
export const getHomeData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const homeData = await DeckService.getHomeData(userId);

  return successResponse(res, 200, { data: homeData });
});

/**
 * Get overall statistics for user
 * GET /api/decks/stats
 */
export const getOverallStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const totalFolders = await Folder.countDocuments({ userId, isDeleted: false });
  const totalDecks = await Deck.countDocuments({ userId, isDeleted: false });
  const totalCards = await Card.countDocuments({ userId, isDeleted: false });
  const cardsByStatus = await Card.aggregate([
    { $match: { userId, isDeleted: false } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const progress = {
    notStudied: 0,
    learning: 0,
    mastered: 0
  };

  cardsByStatus.forEach(item => {
    if (item._id === 'not_studied') progress.notStudied = item.count;
    else if (item._id === 'learning') progress.learning = item.count;
    else if (item._id === 'mastered') progress.mastered = item.count;
  });

  const statsResult = {
    totalFolders,
    totalDecks,
    totalCards,
    progress
  };

  return successResponse(res, 200, { data: statsResult });
});
