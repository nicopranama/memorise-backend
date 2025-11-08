import { fileTypeFromBuffer } from 'file-type';
import { logger } from '../../../shared/utils/logger.js';

const ALLOWED_MAGIC_NUMBERS = [
  'jpg', 'jpeg', 'png', 'webp', 'gif', 
  'pdf'
];

export const validateFileType = async (req, res, next) => {
    if (!req.file || !req.file.buffer) {
        return next();
    }

    try {
        const buffer = req.file.buffer;
        const fileType = await fileTypeFromBuffer(buffer);

        if (fileType && ALLOWED_MAGIC_NUMBERS.includes(fileType.ext)) {
            return next();
        }

        if (
            req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            req.file.mimetype === 'text/plain'
        ) {
            return next();
        }

        const message = `FILE_TYPE_NOT_ALLOWED: File content (${fileType?.ext || 'unknown'}) is not supported`;
        logger.warn(message, { 
            filename: req.file.originalname,
            mimetype: req.file.mimetype,
            detectedExt: fileType?.ext 
        });
        return next(new Error(message));
    } catch (error) {
        const message = 'FILE_CHECK_ERROR: Error checking file content';
        logger.error(message, { error: error.message });
        return next(new Error(message));
    }
};