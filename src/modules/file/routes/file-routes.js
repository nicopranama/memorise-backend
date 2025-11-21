import express from 'express';
import {
  uploadFile,
  getFile,
  deleteFile,
  updateFile,
  listFiles,
  getFileUrl,
  bulkDeleteFiles,
} from '../controllers/file-controller.js';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { upload, translateMulterError } from '../middleware/file-upload.js';
import { validateFileType } from '../middleware/validate-file-type.js';
import { validateRequest } from '../../../shared/middleware/validate-request.js';
import {
  uploadSchema,
  updateSchema,
  listSchema,
  idParamSchema,
  bulkDeleteSchema,
  urlQuerySchema,
} from '../validators/file-validator.js';

const router = express.Router();
router.use(authenticate);

/**
 * POST /api/files/upload
 * Upload a file
 */
router.post(
  '/upload',
  upload.single('file'),
  translateMulterError,
  validateFileType,
  validateRequest(uploadSchema, 'body'),
  uploadFile
);

/**
 * GET /api/files
 * List files with pagination
 */
router.get(
  '/',
  validateRequest(listSchema, 'query'),
  listFiles
);

/**
 * GET /api/files/:id/url
 * Get a presigned URL for a file
 */
router.get(
  '/:id/url',
  validateRequest(idParamSchema, 'params'),
  validateRequest(urlQuerySchema, 'query'),
  getFileUrl
);

/**
 * GET /api/files/:id
 * Get file by ID (redirects to file or returns JSON)
 */
router.get(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  getFile
);

/**
 * PATCH /api/files/:id
 * Update file metadata
 */
router.patch(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  validateRequest(updateSchema, 'body'),
  updateFile
);

/**
 * DELETE /api/files/:id
 * Delete a file
 */
router.delete(
  '/:id',
  validateRequest(idParamSchema, 'params'),
  deleteFile
);

// DELETE /api/files/bulk - Bulk delete files
router.delete(
  '/bulk',
  validateRequest(bulkDeleteSchema, 'body'),
  bulkDeleteFiles
);

export default router;
