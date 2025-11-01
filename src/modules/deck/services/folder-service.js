import Folder from '../models/folder-model.js';
import Deck from '../models/deck-model.js';
import { logger } from '../../../shared/utils/logger.js';
import {
  cacheFolder,
  getCachedFolder,
  invalidateFolderCache,
  cacheStats,
  getCachedStats,
  invalidateStatsCache,
  invalidateHomeCache
} from '../../../shared/utils/cache.js';

export const createFolder = async ({ name, description, color, userId }) => {
  const existingFolder = await Folder.findByUserAndName(userId, name);
  if (existingFolder) {
    throw new Error('FOLDER_CONFLICT: Folder with this name already exists');
  }

  const folder = new Folder({
    name: name.trim(),
    description: description?.trim() || '',
    color: color || '#3B82F6',
    userId
  });

  await folder.save();
  logger.info(`Folder created: ${folder.name} for user ${userId}`);

  await invalidateHomeCache(userId);

  return folder;
};

export const getFoldersByUser = async (userId) => {
  const folders = await Folder.findByUser(userId);
  return folders;
};

export const getFolderById = async (folderId, userId) => {
  try {
    const cachedFolder = await getCachedFolder(folderId);
    if (cachedFolder) {
      if (cachedFolder.userId.toString() === userId) {
        logger.debug(`Cache hit for folder: ${folderId}`);
        return cachedFolder;
      } else {
        throw new Error('FOLDER_NOT_FOUND: Folder not found');
      }
    }
  } catch (error) {
    if (error.message.startsWith('FOLDER_NOT_FOUND')) throw error;
    logger.error(`Error getting folder from cache: ${error.message}`);
  }

  logger.debug(`Cache miss for folder: ${folderId}`);

  const folder = await Folder.findOne({ 
    _id: folderId, 
    userId, 
    isDeleted: false 
  }).populate('decksCount');

  if (!folder) {
    throw new Error('FOLDER_NOT_FOUND: Folder not found');
  }

  try {
    await cacheFolder(folderId, folder.toObject());
  } catch (error) {
    logger.error(`Error caching folder: ${error.message}`);
  }

  return folder;
};

export const updateFolder = async (folderId, userId, updateData) => {
  const folder = await Folder.findOne({ 
    _id: folderId, 
    userId, 
    isDeleted: false 
  });

  if (!folder) {
    throw new Error('FOLDER_NOT_FOUND: Folder not found');
  }

  if (updateData.name && updateData.name !== folder.name) {
    const existingFolder = await Folder.findByUserAndName(userId, updateData.name);
    if (existingFolder) {
      throw new Error('FOLDER_CONFLICT: Folder with this name already exists');
    }
  }

  Object.assign(folder, updateData);
  await folder.save();

  const invalidationPromises = [
    invalidateFolderCache(folderId),
    invalidateHomeCache(userId)
  ];
  await Promise.all(invalidationPromises);

  logger.info(`Folder updated: ${folder.name} for user ${userId}`);
  return folder;
};

export const deleteFolder = async (folderId, userId) => {
  const folder = await Folder.findOne({ 
    _id: folderId, 
    userId, 
    isDeleted: false 
  });

  if (!folder) {
    throw new Error('FOLDER_NOT_FOUND: Folder not found');
  }

  await Deck.updateMany(
    { folderId: folderId, userId },
    { folderId: null }
  );

  await folder.softDelete();
  logger.info(`Folder deleted: ${folder.name} for user ${userId}`);

  const invalidationPromises = [
    invalidateFolderCache(folderId),
    invalidateStatsCache('folder', folderId),
    invalidateHomeCache(userId)
  ];
  await Promise.all(invalidationPromises);

  return { message: 'Folder deleted successfully. All decks have been moved to unassigned.' };
};

export const getFolderStats = async (folderId, userId) => {
  try {
    const cachedStats = await getCachedStats('folder', folderId);
    if (cachedStats) {
      logger.debug(`Cache hit for folder stats: ${folderId}`);
      return cachedStats;
    }
  } catch (error) {
    logger.error(`Error getting folder stats from cache: ${error.message}`);
  }

  logger.debug(`Cache miss for folder stats: ${folderId}`);

  const folder = await Folder.findOne({ 
    _id: folderId, 
    userId, 
    isDeleted: false 
  });

  if (!folder) {
    throw new Error('FOLDER_NOT_FOUND: Folder not found');
  }

  const totalDecks = await Deck.countDocuments({ 
    folderId: folderId, 
    userId, 
    isDeleted: false 
  });

  const totalCardsResult = await Deck.aggregate([
    { $match: { folderId: folderId, userId, isDeleted: false } },
    { $lookup: { from: 'cards', localField: '_id', foreignField: 'deckId', as: 'cards' } },
    { $unwind: '$cards' },
    { $match: { 'cards.isDeleted': false } },
    { $count: 'totalCards' }
  ]);

  const totalCards = totalCardsResult.length > 0 ? totalCardsResult[0].totalCards : 0;
  
  const stats = {
    folderId: folder._id,
    totalDecks,
    totalCards
  };

  try {
    await cacheStats('folder', folderId, stats);
  } catch (error) {
    logger.error(`Error caching folder stats: ${error.message}`);
  }

  return stats;
};
