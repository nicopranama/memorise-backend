import Card from '../models/card-model.js';
import Deck from '../models/deck-model.js';
import { logger } from '../../../shared/utils/logger.js';
import { 
  cacheCardsByDeck, 
  getCachedCardsByDeck, 
  invalidateCardsCache,
  invalidateStatsCache
} from '../../../shared/utils/cache.js';

const invalidateRelatedCaches = async (deckId) => {
  if (!deckId) return;

  const invalidationPromises = [
    invalidateCardsCache(deckId),
    invalidateStatsCache('deck', deckId)
  ];

  try {
    const deck = await Deck.findById(deckId).select('folderId').lean();
    if (deck && deck.folderId) {
      invalidationPromises.push(invalidateStatsCache('folder', deck.folderId));
    }
  } catch (error) {
    logger.error(`Error invalidating related caches for deck ${deckId}: ${error.message}`);
  }

  await Promise.all(invalidationPromises);
  logger.debug(`Invalidated related caches for deck: ${deckId}`);
};


export const createCard = async ({ front, back, deckId, userId, imageFront, imageBack, notes, tags }) => {
  const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  const card = new Card({
    front: front.trim(),
    back: back.trim(),
    deckId,
    userId,
    imageFront: imageFront || null,
    imageBack: imageBack || null,
    notes: notes?.trim() || '',
    tags: tags || []
  });

  await card.save();
  logger.info(`Card created in deck ${deckId} for user ${userId}`);
  await invalidateRelatedCaches(deckId);

  return card;
};

export const getCardsByDeck = async (deckId, userId) => {
  try {
    const cachedCards = await getCachedCardsByDeck(deckId);
    if (cachedCards) {
      logger.debug(`Cache hit for cards in deck: ${deckId}`);
      return cachedCards;
    }
  } catch (error) {
    logger.error(`Error getting cards from cache for deck ${deckId}: ${error.message}`);
  }
  logger.debug(`Cache miss for cards in deck: ${deckId}`);
  
  const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }
  const cards = await Card.findByDeck(deckId, userId);
  
  try {
    await cacheCardsByDeck(deckId, cards);
  } catch (error) {
    logger.error(`Error caching cards for deck ${deckId}: ${error.message}`);
  }

  return cards;
};

export const getCardById = async (cardId, userId) => {
  const card = await Card.findOne({ 
    _id: cardId, 
    userId, 
    isDeleted: false 
  });

  if (!card) {
    throw new Error('CARD_NOT_FOUND: Card not found');
  }

  return card;
};

export const updateCard = async (cardId, userId, updateData) => {
  const card = await Card.findOne({ 
    _id: cardId, 
    userId, 
    isDeleted: false 
  });

  if (!card) {
    throw new Error('CARD_NOT_FOUND: Card not found');
  }

  Object.assign(card, updateData);
  await card.save();

  await invalidateRelatedCaches(card.deckId);

  logger.info(`Card updated: ${card._id} for user ${userId}`);
  return card;
};

export const deleteCard = async (cardId, userId) => {
  const card = await Card.findOne({ 
    _id: cardId, 
    userId, 
    isDeleted: false 
  });

  if (!card) {
    throw new Error('CARD_NOT_FOUND: Card not found');
  }
  
  const deckId = card.deckId;
  await card.softDelete();
  logger.info(`Card deleted: ${card._id} for user ${userId}`);
  
  await invalidateRelatedCaches(deckId);

  return { message: 'Card deleted successfully' };
};

export const updateCardStatus = async (cardId, userId, status) => {
  const card = await Card.findOne({ 
    _id: cardId, 
    userId, 
    isDeleted: false 
  });

  if (!card) {
    throw new Error('CARD_NOT_FOUND: Card not found');
  }

  await card.updateStatus(status);
  logger.info(`Card status updated: ${card._id} to ${status} for user ${userId}`);

  await invalidateRelatedCaches(card.deckId);

  return card;
};

export const updateStudyData = async (cardId, userId, studyData) => {
  const card = await Card.findOne({ 
    _id: cardId, 
    userId, 
    isDeleted: false 
  });

  if (!card) {
    throw new Error('CARD_NOT_FOUND: Card not found');
  }

  await card.updateStudyData(studyData);
  logger.info(`Card study data updated: ${card._id} for user ${userId}`);

  await invalidateRelatedCaches(card.deckId);

  return card;
};

export const addCardTag = async (cardId, userId, tag) => {
  const card = await Card.findOne({ 
    _id: cardId, 
    userId, 
    isDeleted: false 
  });

  if (!card) {
    throw new Error('CARD_NOT_FOUND: Card not found');
  }

  await card.addTag(tag);
  logger.info(`Tag added to card: ${card._id} for user ${userId}`);
  
  await invalidateCardsCache(card.deckId);

  return card;
};

export const removeCardTag = async (cardId, userId, tag) => {
  const card = await Card.findOne({ 
    _id: cardId, 
    userId, 
    isDeleted: false 
  });

  if (!card) {
    throw new Error('CARD_NOT_FOUND: Card not found');
  }

  await card.removeTag(tag);
  logger.info(`Tag removed from card: ${card._id} for user ${userId}`);
  
  await invalidateCardsCache(card.deckId);

  return card;
};

export const getCardsByStatus = async (deckId, userId, status) => {
  const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  const cards = await Card.findByDeckAndStatus(deckId, userId, status);
  return cards;
};

const invalidateBulkCaches = async (cardIds, userId) => {
  const cards = await Card.find({
    _id: { $in: cardIds },
    userId,
    isDeleted: false
  }).select('deckId').lean();

  const deckIds = [...new Set(cards.map(c => c.deckId.toString()))];
  if (deckIds.length === 0) return;

  const decks = await Deck.find({
    _id: { $in: deckIds },
  }).select('folderId').lean();

  const folderIds = [...new Set(decks.map(d => d.folderId?.toString()).filter(Boolean))];

  const invalidationPromises = [];

  deckIds.forEach(deckId => {
    invalidationPromises.push(invalidateCardsCache(deckId));
    invalidationPromises.push(invalidateStatsCache('deck', deckId));
  });

  folderIds.forEach(folderId => {
    invalidationPromises.push(invalidateStatsCache('folder', folderId));
  });

  await Promise.all(invalidationPromises);
  logger.debug(`Bulk cache invalidation complete for decks: ${deckIds.join(', ')} and folders: ${folderIds.join(', ')}`);
};

export const bulkUpdateCards = async (cardIds, userId, updateData) => {
  await invalidateBulkCaches(cardIds, userId);

  const result = await Card.updateMany(
    { _id: { $in: cardIds }, userId, isDeleted: false },
    updateData
  );

  logger.info(`Bulk updated ${result.modifiedCount} cards for user ${userId}`);
  return result;
};

export const bulkDeleteCards = async (cardIds, userId) => {
  await invalidateBulkCaches(cardIds, userId);
  const result = await Card.updateMany(
    { _id: { $in: cardIds }, userId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() }
  );

  logger.info(`Bulk deleted ${result.modifiedCount} cards for user ${userId}`);
  return result;
};
