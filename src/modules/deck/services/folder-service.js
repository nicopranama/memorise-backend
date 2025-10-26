import Folder from '../models/folder-model.js';
import Deck from '../models/deck-model.js';
import { logger } from '../../../shared/utils/logger.js';

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

  return folder;
};

export const getFoldersByUser = async (userId) => {
  const folders = await Folder.findByUser(userId);
  return folders;
};

export const getFolderById = async (folderId, userId) => {
  const folder = await Folder.findOne({ 
    _id: folderId, 
    userId, 
    isDeleted: false 
  }).populate('decksCount');

  if (!folder) {
    throw new Error('FOLDER_NOT_FOUND: Folder not found');
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

  return { message: 'Folder deleted successfully. All decks have been moved to unassigned.' };
};

export const getFolderStats = async (folderId, userId) => {
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

  const totalCards = await Deck.aggregate([
    { $match: { folderId: folderId, userId, isDeleted: false } },
    { $lookup: { from: 'cards', localField: '_id', foreignField: 'deckId', as: 'cards' } },
    { $unwind: '$cards' },
    { $count: 'totalCards' }
  ]);

  return {
    folderId: folder._id,
    totalDecks,
    totalCards: totalCards.length > 0 ? totalCards[0].totalCards : 0
  };
};
