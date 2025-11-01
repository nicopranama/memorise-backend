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

  const invalidationPromises = [invalidateHomeCache(userId)];
  if (folderId) {
    invalidationPromises.push(invalidateStatsCache('folder', folderId));
  }
  await Promise.all(invalidationPromises);

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
  try {
    const cachedDeck = await getCachedDeck(deckId);
    if (cachedDeck) {
      if (cachedDeck.userId.toString() !== userId) {
        throw new Error('DECK_NOT_FOUND: Deck not found');
      }
      logger.debug(`Cache hit for deck: ${deckId}`);
      
      if (!include.length) {
        return cachedDeck;
      }
    }
  } catch (error) {
    if (error.message.startsWith('DECK_NOT_FOUND')) throw error;
    logger.error(`Error getting deck from cache: ${error.message}`);
  }

  logger.debug(`Cache miss for deck: ${deckId}`);

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
    const stats = await getDeckStats(deckId, userId);
    result.stats = stats;
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

  const oldFolderId = deck.folderId;
  const newFolderId = updateData.folderId;
  const folderChanged = newFolderId !== undefined && newFolderId?.toString() !== oldFolderId?.toString();

  if (folderChanged && newFolderId) {
      const folder = await Folder.findOne({ _id: newFolderId, userId, isDeleted: false });
      if (!folder) {
        throw new Error('FOLDER_NOT_FOUND: Folder not found');
      }
  }

  Object.assign(deck, updateData);
  await deck.save();

  const invalidationPromises = [
    invalidateDeckCache(deckId) 
  ];

  if (updateData.name || folderChanged) {
    invalidationPromises.push(invalidateHomeCache(userId));
  }

  if (folderChanged) {
    if (oldFolderId) {
      invalidationPromises.push(invalidateStatsCache('folder', oldFolderId));
    }
    if (newFolderId) {
      invalidationPromises.push(invalidateStatsCache('folder', newFolderId));
    }
  }
  
  await Promise.all(invalidationPromises);

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

  const oldFolderId = deck.folderId;
  if (oldFolderId?.toString() === newFolderId?.toString()) {
    return deck;
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

  const invalidationPromises = [
    invalidateDeckCache(deckId),
    invalidateHomeCache(userId)
  ];

  if (oldFolderId) {
    invalidationPromises.push(invalidateStatsCache('folder', oldFolderId));
  }

  if (newFolderId) {
    invalidationPromises.push(invalidateStatsCache('folder', newFolderId));
  }

  await Promise.all(invalidationPromises);

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
  
  const folderId = deck.folderId;

  await Card.updateMany(
    { deckId: deckId, userId },
    { isDeleted: true, deletedAt: new Date() }
  );

  await deck.softDelete();

  const invalidationPromises = [
    invalidateDeckCache(deckId),
    invalidateCardsCache(deckId),
    invalidateStatsCache('deck', deckId),
    invalidateHomeCache(userId)
  ];

  if (folderId) {
    invalidationPromises.push(invalidateStatsCache('folder', folderId));
  }

  await Promise.all(invalidationPromises);

  logger.info(`Deck deleted: ${deck.name} for user ${userId}`);
  return { message: 'Deck deleted successfully' };
};

export const getDeckStats = async (deckId, userId) => {
  try {
    const cachedStats = await getCachedStats('deck', deckId);
    if (cachedStats) {
      logger.debug(`Cache hit for deck stats: ${deckId}`);
      return cachedStats;
    }
  } catch (error) {
    logger.error(`Error getting deck stats from cache: ${error.message}`)
  }

  logger.debug(`Cache miss for deck stats: ${deckId}`);

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

  const stats = {
    deckId: deck._id,
    totalCards,
    progress
  };

  try {
    await cacheStats('deck', deckId, stats);
  } catch (error) {
    logger.error(`Error caching deck stats: ${error.message}`);
  }

  return stats;
};

export const getHomeData = async (userId) => {
  const cachedHomeData = await getCachedHomeData(userId);
  if (cachedHomeData) {
    logger.debug(`Cache hit for home data: ${userId}`)
    return cachedHomeData;
  }

  logger.debug(`Cache miss for home data: ${userId}`);

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
