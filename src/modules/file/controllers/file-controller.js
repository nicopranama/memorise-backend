import { asyncHandler } from '../../../shared/middleware/async-handler.js';
import { successResponse, createdResponse } from '../../../shared/utils/response-utils.js';
import * as StorageService from '../services/storage-service.js';

/**
 * Upload a file
 * POST /api/files/upload
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new Error('FILE_BAD_REQUEST: No file uploaded');
  }

  const file = await StorageService.uploadFile(
    req.file,        
    req.user.id,       
    {                   
      model: req.body.refModel, 
      id: req.body.refId 
    }, 
    req.body.idempotencyKey 
  );

  return createdResponse(res, 'File uploaded successfully', file);
});

/**
 * Get file by ID
 * GET /api/files/:id
 */
export const getFile = asyncHandler(async (req, res) => {
  const file = await StorageService.getFileById(req.params.id, req.user.id);

  if (file.url && !file.storageKey) {
    return res.redirect(file.url);
  }

  const url = await StorageService.getPresignedUrl(req.params.id, req.user.id, 3600);
  
  if (req.get('accept')?.includes('application/json')) {
    return successResponse(res, 200, {
      data: {...file.toObject(), url,},
    });
  }
  res.redirect(url);
});

/**
 * Delete a file
 * DELETE /api/files/:id
 */
export const deleteFile = asyncHandler(async (req, res) => {
  await StorageService.deleteFile(req.params.id, req.user.id);
  return successResponse(res, 200, { message: 'File deleted successfully' });
});

/**
 * Update file metadata
 * PATCH /api/files/:id
 */
export const updateFile = asyncHandler(async (req, res) => {
  const file = await StorageService.updateFileMetadata(
    req.params.id,
    req.user.id,
    req.body
  );
  
  return successResponse(res, 200, { data: file });
});

/**
 * List files with pagination
 * GET /api/files
 */
export const listFiles = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  const filters = {
    ownerId: req.user.id,
    ...(req.query.ownerType && { ownerType: req.query.ownerType }),
    ...(req.query.refModel && { refModel: req.query.refModel }),
    ...(req.query.refId && { refId: req.query.refId })
  };

  const result = await StorageService.listFiles(filters, { page, limit });
  
  return successResponse(res, 200, { data: result });
});

/**
 * Get file URL
 * GET /api/files/:id/url
 */
export const getFileUrl = asyncHandler(async (req, res) => {
  const expiresIn = parseInt(req.query.expiresIn, 10) || 3600;
  const url = await StorageService.getPresignedUrl(req.params.id, req.user.id, expiresIn);
  
  return successResponse(res, 200, { data: { url, expiresIn } });
});

/**
 * Bulk delete files
 * DELETE /api/files/bulk
 */
export const bulkDeleteFiles = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  
  if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('FILE_BAD_REQUEST: Invalid IDs');
  }

  const filesResult = await StorageService.listFiles({
      _id: { $in: ids },
      ownerId: req.user.id
  }, { limit: 1000 });

  const ownedIds = filesResult.data.map(f => f._id);

  if (ownedIds.length === 0) {
      return successResponse(res, 200, { 
          data: { success: true, deletedCount: 0 },
          message: 'No files found to delete'
      });
  }

  const result = await StorageService.deleteMultipleFiles(ownedIds);
  return successResponse(res, 200, { data: result });
});
