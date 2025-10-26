import Card from '../models/card-model.js';
import Deck from '../models/deck-model.js';
import { logger } from '../../../shared/utils/logger.js';

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

  return card;
};

export const getCardsByDeck = async (deckId, userId) => {
  const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  const cards = await Card.findByDeck(deckId, userId);
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

  await card.softDelete();
  logger.info(`Card deleted: ${card._id} for user ${userId}`);

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

  return card;
};

export const getCardStats = async (deckId, userId) => {
  // Verify deck exists and belongs to user
  const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  const stats = await Card.getStatsByDeck(deckId, userId);
  
  const progress = {
    notStudied: 0,
    learning: 0,
    mastered: 0
  };

  stats.forEach(stat => {
    if (stat._id === 'not_studied') progress.notStudied = stat.count;
    else if (stat._id === 'learning') progress.learning = stat.count;
    else if (stat._id === 'mastered') progress.mastered = stat.count;
  });

  const totalCards = progress.notStudied + progress.learning + progress.mastered;

  return {
    deckId,
    totalCards,
    progress
  };
};

export const getCardsByStatus = async (deckId, userId, status) => {
  // Verify deck exists and belongs to user
  const deck = await Deck.findOne({ _id: deckId, userId, isDeleted: false });
  if (!deck) {
    throw new Error('DECK_NOT_FOUND: Deck not found');
  }

  const cards = await Card.findByDeckAndStatus(deckId, userId, status);
  return cards;
};

export const bulkUpdateCards = async (cardIds, userId, updateData) => {
  const result = await Card.updateMany(
    { _id: { $in: cardIds }, userId, isDeleted: false },
    updateData
  );

  logger.info(`Bulk updated ${result.modifiedCount} cards for user ${userId}`);
  return result;
};

export const bulkDeleteCards = async (cardIds, userId) => {
  const result = await Card.updateMany(
    { _id: { $in: cardIds }, userId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() }
  );

  logger.info(`Bulk deleted ${result.modifiedCount} cards for user ${userId}`);
  return result;
};
