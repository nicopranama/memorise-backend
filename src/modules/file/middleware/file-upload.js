import multer from 'multer';
import path from 'path';
import { logger } from '../../../shared/utils/logger.js';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.docx', '.txt'
]

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
      logger.warn(`[File Upload] Unsupported file type: ${file.originalname}`);
      return cb(new Error('FILE_TYPE_NOT_ALLOWED: Unsupported file type'), false);
    }
    cb(null, true);
  } catch (error) {
    logger.error(`[File Upload] Error checking file type: ${error.message}`);
    cb(new Error('FILE_TYPE_ERROR: Failed to check file type'), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

export const translateMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      logger.warn(`[File Upload] File too large: ${err.message}`);
      return next(new Error('FILE_TOO_LARGE: File size exceeds the limit'));
    }
    logger.warn(`[File Upload] ${err.message}`, {code: err.code});
    return next(new Error(`FILE_UPLOAD_ERROR: ${err.message}`));
  }
  return next(err);
}