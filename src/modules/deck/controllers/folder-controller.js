import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { successResponse, createdResponse } from '../../../shared/utils/response-utils.js';
import * as FolderService from '../services/folder-service.js';

/**
 * Create new folder
 * POST /api/folders
 */
export const createFolder = asyncHandler(async (req, res) => {
  const { name, description, color } = req.body;
  const userId = req.user.id;

  const folder = await FolderService.createFolder({
    name,
    description,
    color,
    userId
  });

  return createdResponse(res, 'Folder created successfully', folder);
});

/**
 * Get all folders for user
 * GET /api/folders
 */
export const getFolders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const folders = await FolderService.getFoldersByUser(userId);

  return successResponse(res, 200, { data: folders });
});

/**
 * Get folder by ID
 * GET /api/folders/:id
 */
export const getFolderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const folder = await FolderService.getFolderById(id, userId);

  return successResponse(res, 200, { data: folder });
});

/**
 * Update folder
 * PATCH /api/folders/:id
 */
export const updateFolder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = req.body;

  const folder = await FolderService.updateFolder(id, userId, updateData);

  return successResponse(res, 200, { data: folder });
});

/**
 * Delete folder
 * DELETE /api/folders/:id
 */
export const deleteFolder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = await FolderService.deleteFolder(id, userId);

  return successResponse(res, 200, result);
});

/**
 * Get folder statistics
 * GET /api/folders/:id/stats
 */
export const getFolderStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const stats = await FolderService.getFolderStats(id, userId);

  return successResponse(res, 200, { data: stats });
});
