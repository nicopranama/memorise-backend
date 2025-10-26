import express from 'express';
import { authenticate } from '../../auth/middleware/authenticate.js';
import { validateRequest } from '../../../shared/middleware/validate-request.js';
import {
  createFolder,
  getFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  getFolderStats
} from '../controllers/folder-controller.js';
import {
  createFolderSchema,
  updateFolderSchema,
  folderParamsSchema
} from '../validators/folder-validators.js';

const router = express.Router();

router.use(authenticate);

// POST /api/folders - Create new folder
router.post(
  '/',
  validateRequest(createFolderSchema),
  createFolder
);

// GET /api/folders - Get all folders for user
router.get(
  '/',
  getFolders
);

// GET /api/folders/:id - Get folder by ID
router.get(
  '/:id',
  validateRequest(folderParamsSchema, 'params'),
  getFolderById
);

// PATCH /api/folders/:id - Update folder
router.patch(
  '/:id',
  validateRequest(folderParamsSchema, 'params'),
  validateRequest(updateFolderSchema),
  updateFolder
);

// DELETE /api/folders/:id - Delete folder
router.delete(
  '/:id',
  validateRequest(folderParamsSchema, 'params'),
  deleteFolder
);

// GET /api/folders/:id/stats - Get folder statistics
router.get(
  '/:id/stats',
  validateRequest(folderParamsSchema, 'params'),
  getFolderStats
);

export default router;
