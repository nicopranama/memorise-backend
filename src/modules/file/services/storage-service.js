import crypto from 'crypto';
import { getStorageClient, storageConfig } from '../../../config/storage.js';
import { logger } from '../../../shared/utils/logger.js';
import File from '../models/file-model.js';
import {
  cacheFileMetadata,
  getCachedFileMetadata,
  cachePresignedUrl,
  getCachedPresignedUrl,
  invalidateFileCache,
  invalidateMultipleFiles,
  acquireIdempotencyLock,
  releaseIdempotencyLock
} from '../../../shared/utils/cache.js';


const { provider, bucket, region } = storageConfig;

export const initializeStorage = async () => {
    try {
        const client = getStorageClient();
        logger.info(`[Storage] Initializing ${provider.toUpperCase()} storage`);
        if (provider === 'minio') {
            const exists = await client.bucketExists(bucket);
            if (!exists) {
                await client.makeBucket(bucket, region);
                logger.info(`[Storage] MinIO bucket "${bucket}" created successfully`);
            } else {
                logger.info(`[Storage] MinIO bucket "${bucket}" already exists`);
            }
        } else if (provider === 's3') {
            try {
                await client.headBucket({ Bucket: bucket }).promise();
                logger.info(`[Storage] S3 bucket "${bucket}" verified.`);
            } catch (error) {
                if (error.code === 'NotFound') {
                    await client.createBucket({ Bucket: bucket }).promise();
                    logger.info(`[Storage] S3 bucket "${bucket}" created successfully`);
                } else {
                    throw error;
                }
            }
        }
        logger.info(`[Storage] Ready: ${provider}/${bucket}`);
    } catch (error) {
        logger.error(`[Storage] Initialization failed: ${error.message}`);
        throw error;
    }
};


const generateStorageKey = (userId, originalname) => {
    const unique = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
    const sanitized = originalname.replace(/[^a-zA-Z0-9.\-_]/g, '-').replace(/\s+/g, '-');
    return `users/${userId}/files/${unique}-${sanitized}`;
};

export const uploadFile = async (file, userId, ref = {}, idempotencyKey = null) => {
    try {
        if (idempotencyKey) {
            const lockAcquired = await acquireIdempotencyLock(`upload:${idempotencyKey}`);
            if (!lockAcquired) {
                logger.warn(`[Storage] Upload skipped, idempotency lock exists: ${idempotencyKey}`);
                const existingFile = await File.findOne({ idempotencyKey });
                return existingFile || { message: 'Duplicate upload request detected'};
            }
        }
        const client = getStorageClient();
        const storageKey = generateStorageKey(userId, file.originalname);

        if (provider === 'minio') {
            await client.putObject(bucket, storageKey, file.buffer, { 'Content-Type': file.mimetype });
        } else if (provider === 's3') {
            await client.upload({ Bucket: bucket, Key: storageKey, Body: file.buffer, ContentType: file.mimetype }).promise();
        }
        const newFile = await File.create({
            originalname: file.originalname,
            storageKey,
            bucket,
            size: file.size,
            contentType: file.mimetype,
            provider,
            ownerId: userId,
            refModel: ref.model,
            refId: ref.id,
            idempotencyKey,
            status: 'uploaded'
        });
        await cacheFileMetadata(newFile);
        logger.info(`[Storage] File uploaded successfully: ${storageKey}`);
        return newFile;
    } catch (error) {
        if (idempotencyKey) {
            await releaseIdempotencyLock(`upload:${idempotencyKey}`);
        }
        logger.error(`[Storage] File upload failed: ${error.message}`);
        throw error;
    }
};

export const getFileById = async (fileId) => {
    try {
        const cached = await getCachedFileMetadata(fileId);
        if (cached) {
            logger.debug(`[Storage] Cache hit for file metadata: ${fileId}`);
            return File.hydrate(cached);
        }
        const fileDoc = await File.findById(fileId);
        if (fileDoc) {
            await cacheFileMetadata(fileDoc.toObject());
        } else {
            logger.warn(`[Storage] File metadata not found in database: ${fileId}`);
        }
        return fileDoc;
    } catch (error) {
        logger.error(`[Storage] Failed to get file by ID: ${error.message}`);
        throw error;
    }
};

export const getPresignedUrl = async (fileId, expiry = 3600) => {
    try {
        const cachedUrl = await getCachedPresignedUrl(fileId);
        if (cachedUrl) {
            logger.debug(`[Storage] Cache hit for presigned URL: ${fileId}`);
            return cachedUrl;
        }
        const fileDoc = await getFileById(fileId);

        if (!fileDoc) {
            throw new Error('File not found');
        }

        const client = getStorageClient();
        const url = await fileDoc.getPresignedUrl(client, expiry);
        const ttl = expiry > 60 ? expiry - 60 : expiry;
        await cachePresignedUrl(fileId, url, ttl);
        logger.info(`[Storage] Presigned URL generated: ${fileId}`);
        return url;
    } catch (error) {
        logger.error(`[Storage] Failed to generate presigned URL: ${error.message}`);
        throw error;
    }
};

export const deleteFile = async (fileId) => {
    try {
        const fileDoc = await File.findById(fileId);
        if (!fileDoc || fileDoc.status === 'deleted') {
            logger.warn(`[Storage] File not found or already deleted: ${fileId}`);
            return { success: false, message: 'File not found or already deleted'};
        }

        const client = getStorageClient();
        if (provider === 'minio' ) {
            await client.removeObject(fileDoc.bucket, fileDoc.storageKey);
        } else if (provider === 's3') {
            await client.deleteObject({ Bucket: fileDoc.bucket, Key: fileDoc.storageKey }).promise();
        }

        await fileDoc.remove();
        await invalidateFileCache(fileId);
        logger.info(`[Storage] File deleted and cache invalidated: ${fileDoc.storageKey}`);
        return { success: true };

    } catch (error) {
        logger.error(`[Storage] Failed to delete file: ${error.message}`);
        throw error;
    }
};

export const deleteMultipleFiles = async (fileIds) => {
    try {
        const files = await File.find({ _id: { $in: fileIds }, status: { $ne: 'deleted' }});
        if (files.length === 0) {
            return { success: true, deletedCount: 0 };
        }

        const keysToDelete = files.map((file) => file.storageKey);
        const client = getStorageClient();
        if (provider === 'minio') {
            await client.removeObjects(bucket, keysToDelete)
        } else if (provider === 's3') {
            await client.deleteObjects({
                Bucket: bucket,
                Delete: { Objects: keysToDelete.map((Key) => ({ Key })) },
            })
            .promise();
        }

        await Promise.all([
            File.updateMany({ _id: { $in: fileIds } }, { $set: { status: 'deleted', deletedAt: new Date() }} ),
            invalidateMultipleFiles(fileIds),
        ]);
        logger.info(`[Storage] Bulk deleted ${files.length} files`);
        return { success: true, deletedCount: files.length };

    } catch (error) {
        logger.error(`[Storage] Failed to bulk delete files: ${error.message}`);
        throw error;
    }
};

export const listFiles = async (filters = {}, options = { limit: 10, page: 1 }) => {
    try {
        const query = { ...filters, status: { $ne: 'deleted' } };
        const files = await File.find(query).sort({ createdAt: -1 }).skip((options.page - 1) * options.limit).limit(options.limit).lean();
        logger.debug(`[Storage] Retrieved ${files.length} files`);
        return files;
    } catch (error) {
        logger.error(`[Storage] Failed to list files: ${error.message}`);
        throw error;
    }
};

export const checkStorageHealth = async () => {
    try {
        const client = getStorageClient();
        if (provider === 'minio') {
            const exists = await client.bucketExists(bucket);
            if (!exists) return { healthy: false, error: 'Bucket not found'};
        } else if (provider === 's3') {
            await client.headBucket({ Bucket: bucket }).promise();
        }
        logger.debug(`[Storage] Health check passed`);
        return { healthy: true, provider, bucket, region };
    } catch (error) {
        logger.error(`[Storage] Health check failed: ${error.message}`);
        return { healthy: false, provider, error: error.message };
    }
};