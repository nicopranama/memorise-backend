import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { successResponse, createdResponse } from '../../../shared/utils/response-utils.js';
import * as CardService from '../services/card-service.js';
import * as StorageService from '../../file/services/storage-service.js';
import { logger } from '../../../shared/utils/logger.js';

/**
 * Create new card
 * POST /api/cards
 * Supports file upload for imageFront and imageBack, or URL strings
 */
export const createCard = asyncHandler(async (req, res) => {
  const { deckId, front, back, imageFront, imageBack, notes, tags } = req.body;
  const userId = req.user.id;

  let imageFrontUrl = null;
  let imageBackUrl = null;

  if (req.files) {
    if (req.files.imageFront && req.files.imageFront[0]) {
      try {
        const uploadedFile = await StorageService.uploadFile(
          req.files.imageFront[0],
          userId,
          { model: 'Card' }, 
          null
        );

        imageFrontUrl = `/api/files/${uploadedFile._id}`;
        logger.info(`ImageFront uploaded for card creation: ${uploadedFile._id}`);
      } catch (error) {
        logger.error(`Failed to upload imageFront: ${error.message}`);
        throw new Error(`IMAGE_UPLOAD_ERROR: Failed to upload front image - ${error.message}`);
      }
    }

    if (req.files.imageBack && req.files.imageBack[0]) {
      try {
        const uploadedFile = await StorageService.uploadFile(
          req.files.imageBack[0],
          userId,
          { model: 'Card' },
          null
        );
        imageBackUrl = `/api/files/${uploadedFile._id}`;
        logger.info(`ImageBack uploaded for card creation: ${uploadedFile._id}`);
      } catch (error) {
        logger.error(`Failed to upload imageBack: ${error.message}`);
        throw new Error(`IMAGE_UPLOAD_ERROR: Failed to upload back image - ${error.message}`);
      }
    }
  }

  if (!imageFrontUrl && imageFront) {
    imageFrontUrl = imageFront.trim() || null;
  }
  if (!imageBackUrl && imageBack) {
    imageBackUrl = imageBack.trim() || null;
  }

  const card = await CardService.createCard({
    front,
    back,
    deckId,
    userId,
    imageFront: imageFrontUrl,
    imageBack: imageBackUrl,
    notes,
    tags
  });

  if (req.files) {
    const updatePromises = [];
    
    if (req.files.imageFront && req.files.imageFront[0] && imageFrontUrl) {
      const fileId = imageFrontUrl.replace('/api/files/', '');
      updatePromises.push(
        StorageService.updateFileMetadata(fileId, userId, {
          refModel: 'Card',
          refId: card._id
        }).catch(err => {
          logger.error(`Failed to update imageFront file reference: ${err.message}`);
        })
      );
    }

    if (req.files.imageBack && req.files.imageBack[0] && imageBackUrl) {
      const fileId = imageBackUrl.replace('/api/files/', '');
      updatePromises.push(
        StorageService.updateFileMetadata(fileId, userId, {
          refModel: 'Card',
          refId: card._id
        }).catch(err => {
          logger.error(`Failed to update imageBack file reference: ${err.message}`);
        })
      );
    }

    await Promise.all(updatePromises);
  }

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
 * Supports file upload for imageFront and imageBack, or URL strings
 */
export const updateCard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = { ...req.body };

  // Handle file uploads if present (file upload takes priority over URL in body)
  if (req.files) {
    // Handle imageFront file upload
    if (req.files.imageFront && req.files.imageFront[0]) {
      try {
        const card = await CardService.getCardById(id, userId);
        const uploadedFile = await StorageService.uploadFile(
          req.files.imageFront[0],
          userId,
          { model: 'Card', id: card._id },
          null
        );
        // Store endpoint URL for accessing the file
        updateData.imageFront = `/api/files/${uploadedFile._id}`;
        logger.info(`ImageFront uploaded for card update: ${uploadedFile._id}`);
      } catch (error) {
        logger.error(`Failed to upload imageFront: ${error.message}`);
        throw new Error(`IMAGE_UPLOAD_ERROR: Failed to upload front image - ${error.message}`);
      }
    }

    // Handle imageBack file upload
    if (req.files.imageBack && req.files.imageBack[0]) {
      try {
        const card = await CardService.getCardById(id, userId);
        const uploadedFile = await StorageService.uploadFile(
          req.files.imageBack[0],
          userId,
          { model: 'Card', id: card._id },
          null
        );
        // Store endpoint URL for accessing the file
        updateData.imageBack = `/api/files/${uploadedFile._id}`;
        logger.info(`ImageBack uploaded for card update: ${uploadedFile._id}`);
      } catch (error) {
        logger.error(`Failed to upload imageBack: ${error.message}`);
        throw new Error(`IMAGE_UPLOAD_ERROR: Failed to upload back image - ${error.message}`);
      }
    }
  }

  // Clean up empty strings to null
  if (updateData.imageFront === '') {
    updateData.imageFront = null;
  }
  if (updateData.imageBack === '') {
    updateData.imageBack = null;
  }

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
