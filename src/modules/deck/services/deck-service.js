import Deck from '../models/deck-model.js';
import Folder from '../models/folder-model.js';
import Card from '../models/card-model.js';
import { logger } from '../../../shared/utils/logger.js';
import {
  cacheDeck,
  getCachedDeck,
  invalidateDeckCache,
  cacheCardsByDeck,
  getCachedCardsByDeck,
  invalidateCardsCache,
  cacheStats,
  getCachedStats,
  invalidateStatsCache,
  cacheHomeData,
  getCachedHomeData,
  invalidateHomeCache
} from '../../../shared/utils/cache.js';

export const createDeck = async ({ name, description, folderId, userId, isDraft = false }) => {
  const existingDeck = await Deck.findByUserAndName(userId, name);
  if (existingDeck) {
    throw new Error('DECK_CONFLICT: Deck with this name already exists');
  }

  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, userId, isDeleted: false });
    if (!folder) {
      throw new Error('FOLDER_NOT_FOUND: Folder not found');
    }
  }

  const deck = new Deck({
    name: name.trim(),
    description: description?.trim() || '',
    folderId: folderId || null,
    userId,
    isDraft
  });

  await deck.save();
  logger.info(`Deck created: ${deck.name} for user ${userId}`);

  return deck;
};

export const getDecksByUser = async (userId, filters = {}) => {
  const query = { userId, isDeleted: false };

  if (filters.folderId) {
    query.folderId = filters.folderId;
  }

  if (filters.unassigned === 'true') {
    query.folderId = null;
  }

  if (filters.isDraft !== undefined) {
    query.isDraft = filters.isDraft === 'true';
  }

  const decks = await Deck.find(query).sort({ createdAt: -1 });
  return decks;
};

export const getDeckById = async (deckId, userId, include = []) => {
  const cachedDeck = await getCachedDeck(deckId);
  if (cachedDeck && !include.length) {
    return cachedDeck;
  }

  const deck = await Deck.findOne({ 
    _id: deckId, 
    userId, 
    isDeleted: false 
  });

  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  const result = deck.toObject();

  if (include.includes('cards')) {
    const cachedCards = await getCachedCardsByDeck(deckId);
    if (cachedCards) {
      result.cards = cachedCards;
    } else {
      const cards = await Card.findByDeck(deckId, userId);
      result.cards = cards;
      await cacheCardsByDeck(deckId, cards);
    }
  }

  if (include.includes('stats')) {
    const cachedStats = await getCachedStats('deck', deckId);
    if (cachedStats) {
      result.stats = cachedStats;
    } else {
      const stats = await getDeckStats(deckId, userId);
      result.stats = stats;
      await cacheStats('deck', deckId, stats);
    }
  }

  if (!include.length) {
    await cacheDeck(deckId, result);
  }

  return result;
};

export const updateDeck = async (deckId, userId, updateData) => {
  const deck = await Deck.findOne({ 
    _id: deckId, 
    userId, 
    isDeleted: false 
  });

  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  if (updateData.name && updateData.name !== deck.name) {
    const existingDeck = await Deck.findByUserAndName(userId, updateData.name);
    if (existingDeck) {
      throw new Error('DECK_CONFLICT: Deck with this name already exists');
    }
  }

  if (updateData.folderId !== undefined && updateData.folderId !== deck.folderId) {
    if (updateData.folderId) {
      const folder = await Folder.findOne({ 
        _id: updateData.folderId, 
        userId, 
        isDeleted: false 
      });
      if (!folder) {
        throw new Error('FOLDER_NOT_FOUND: Folder not found');
      }
    }
  }

  Object.assign(deck, updateData);
  await deck.save();

  await invalidateDeckCache(deckId);
  await invalidateCardsCache(deckId);
  await invalidateStatsCache('deck', deckId);

  logger.info(`Deck updated: ${deck.name} for user ${userId}`);
  return deck;
};

export const moveDeck = async (deckId, userId, newFolderId) => {
  const deck = await Deck.findOne({ 
    _id: deckId, 
    userId, 
    isDeleted: false 
  });

  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  if (newFolderId) {
    const folder = await Folder.findOne({ 
      _id: newFolderId, 
      userId, 
      isDeleted: false 
    });
    if (!folder) {
      throw new Error('FOLDER_NOT_FOUND: Folder not found');
    }
  }

  deck.folderId = newFolderId;
  await deck.save();

  await invalidateDeckCache(deckId);
  await invalidateHomeCache(userId);

  logger.info(`Deck moved: ${deck.name} to folder ${newFolderId || 'unassigned'} for user ${userId}`);
  return deck;
};

export const deleteDeck = async (deckId, userId) => {
  const deck = await Deck.findOne({ 
    _id: deckId, 
    userId, 
    isDeleted: false 
  });

  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  await Card.updateMany(
    { deckId: deckId, userId },
    { isDeleted: true, deletedAt: new Date() }
  );

  await deck.softDelete();

  await invalidateDeckCache(deckId);
  await invalidateCardsCache(deckId);
  await invalidateStatsCache('deck', deckId);
  await invalidateHomeCache(userId);

  logger.info(`Deck deleted: ${deck.name} for user ${userId}`);
  return { message: 'Deck deleted successfully' };
};

export const getDeckStats = async (deckId, userId) => {
  const deck = await Deck.findOne({ 
    _id: deckId, 
    userId, 
    isDeleted: false 
  });

  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  const totalCards = await Card.countDocuments({ 
    deckId: deckId, 
    userId, 
    isDeleted: false 
  });

  const cardsByStatus = await Card.aggregate([
    { $match: { deckId: deckId, userId, isDeleted: false } },
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

  return {
    deckId: deck._id,
    totalCards,
    progress
  };
};

export const getHomeData = async (userId) => {
  const cachedHomeData = await getCachedHomeData(userId);
  if (cachedHomeData) {
    return cachedHomeData;
  }

  const folders = await Folder.findByUser(userId);
  const foldersWithDecks = await Promise.all(
    folders.map(async (folder) => {
      const decks = await Deck.findByUserAndFolder(userId, folder._id);
      return {
        id: folder._id,
        name: folder.name,
        description: folder.description,
        color: folder.color,
        decks: decks.map(deck => ({
          id: deck._id,
          name: deck.name,
          description: deck.description,
          cardsCount: 0, 
          createdAt: deck.createdAt,
          updatedAt: deck.updatedAt
        }))
      };
    })
  );

  const unassignedDecks = await Deck.findUnassignedByUser(userId);
  const unassignedDecksFormatted = unassignedDecks.map(deck => ({
    id: deck._id,
    name: deck.name,
    description: deck.description,
    cardsCount: 0, 
    createdAt: deck.createdAt,
    updatedAt: deck.updatedAt
  }));

  const homeData = {
    folders: foldersWithDecks,
    unassignedDecks: unassignedDecksFormatted
  };

  await cacheHomeData(userId, homeData);

  return homeData;
};
