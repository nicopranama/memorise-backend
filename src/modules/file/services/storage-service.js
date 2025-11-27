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
    const session = await File.startSession();
    session.startTransaction();

    try {
        if (idempotencyKey) {
            const lockAcquired = await acquireIdempotencyLock(`upload:${idempotencyKey}`);
            if (!lockAcquired) {
                logger.warn(`[Storage] Upload skipped, idempotency lock exists: ${idempotencyKey}`);
                const existingFile = await File.findOne({ idempotencyKey });
                await session.abortTransaction();
                session.endSession();
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

        const newFiles = await File.create([{
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
        }], { session: session });
        const newFile = newFiles[0];
        await session.commitTransaction();
        await cacheFileMetadata(newFile);
        logger.info(`[Storage] File uploaded successfully: ${storageKey}`);
        return newFile;
    } catch (error) {
        await session.abortTransaction();
        if (idempotencyKey) {
            await releaseIdempotencyLock(`upload:${idempotencyKey}`);
        }

        logger.error(`[Storage] File upload failed: ${error.message}`);
        throw error;
    } finally {
        session.endSession();
    }
};

export const getFileById = async (fileId, userId) => {
    try {
        const cached = await getCachedFileMetadata(fileId);
        if (cached) {
            if (userId && cached.ownerId.toString() != userId.toString()) {
                throw new Error('FILE_NOT_FOUND: File not found or access denied');
            }
            logger.debug(`[Storage] Cache hit for file metadata: ${fileId}`);
            return File.hydrate(cached);
        }

        const fileDoc = await File.findById(fileId);

        if (!fileDoc || (userId && fileDoc.ownerId.toString() !== userId.toString())) {
            logger.warn(`[Storage] Unauthorized access attempt: ${fileId} by ${userId}`);
            throw new Error('FILE_NOT_FOUND: File not found'); 
        }

        await cacheFileMetadata(fileDoc.toObject());
        return fileDoc;
    } catch (error) {
        if (error.message.includes('FILE_NOT_FOUND')) throw error;
        logger.error(`[Storage] Failed to get file by ID: ${error.message}`);
        throw error;
    }
};

export const getPresignedUrl = async (fileId, userId, expiry = 3600) => {
    try {
        const cachedUrl = await getCachedPresignedUrl(fileId);
        if (cachedUrl) {
            await getFileById(fileId, userId);
            logger.debug(`[Storage] Cache hit for presigned URL: ${fileId}`);
            return cachedUrl;
        }

        const fileDoc = await getFileById(fileId, userId);

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

export const deleteFile = async (fileId, userId) => {
    const session = await File.startSession();
    session.startTransaction();

    try {
        const fileDoc = await File.findOne({
            _id: fileId,
            ownerId: userId
        }).session(session);

        if (!fileDoc) {
            logger.warn(`[Storage] File not found or already deleted: ${fileId}`);
            await session.abortTransaction();
            session.endSession();
            throw new Error('FILE_NOT_FOUND: File not found or already deleted');
        }

        const client = getStorageClient();
        if (provider === 'minio' ) {
            await client.removeObject(fileDoc.bucket, fileDoc.storageKey);
        } else if (provider === 's3') {
            await client.deleteObject({ Bucket: fileDoc.bucket, Key: fileDoc.storageKey }).promise();
        }

        await fileDoc.deleteOne({ session: session });
        await session.commitTransaction();
        await invalidateFileCache(fileId);
        logger.info(`[Storage] File deleted and cache invalidated: ${fileDoc.storageKey}`);
        return { success: true };

    } catch (error) {
        await session.abortTransaction();
        logger.error(`[Storage] Failed to delete file: ${error.message}`);
        throw error;
    } finally {
        session.endSession();
    }
};

export const deleteMultipleFiles = async (fileIds) => {
    const session = await File.startSession();
    session.startTransaction();

    try {
        const files = await File.find({ 
            _id: { $in: fileIds }, 
        }).session(session);

        if (files.length === 0) {
            await session.abortTransaction();
            session.endSession();
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
            }).promise();
        }

        await File.deleteMany(
            { _id: { $in: fileIds } }, 
            { session: session }
        );

        await session.commitTransaction();
        await invalidateMultipleFiles(fileIds);

        logger.info(`[Storage] Bulk deleted ${files.length} files`);
        return { success: true, deletedCount: files.length };

    } catch (error) {
        await session.abortTransaction();
        logger.error(`[Storage] Failed to bulk delete files: ${error.message}`);
        throw error;
    } finally {
        session.endSession();
    }
};

export const listFiles = async (filters = {}, options = { limit: 10, page: 1 }) => {
    try {
        const page = Math.max(1, options.page);
        const limit = Math.max(1, Math.min(100, options.limit));
        const skip = (page - 1) * limit;

        const query = { ...filters };
        const [files, total] = await Promise.all([
            File.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            File.countDocuments(query)
        ]) ;

        const totalPages = Math.ceil(total / limit);
        logger.debug(`[Storage] Retrieved ${files.length} files (Page ${page} of ${totalPages})`);

        return {
            data: files,
            pagination: {
                total,
                totalPages,
                currentPage: page,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };

    } catch (error) {
        logger.error(`[Storage] Failed to list files: ${error.message}`);
        throw error;
    }
};

export const updateFileMetadata = async (fileId, userId, updates) => {
    const allowedUpdates = ['isPublic', 'metadata', 'refModel', 'refId'];
    const updatesToApply = {};
  
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updatesToApply[key] = updates[key];
      }
    });
  
    const file = await File.findOneAndUpdate(
      { _id: fileId, ownerId: userId },
      { $set: updatesToApply },
      { new: true, runValidators: true }
    );
  
    if (!file) {
      throw new Error('FILE_NOT_FOUND: File not found or access denied');
    }

    await cacheFileMetadata(file);
  
    logger.info(`File metadata updated: ${fileId}`);
    return file;
};

const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));
    });
};

export const getFileBuffer = async (fileId, userId) => {
    try {
        const fileDoc = await File.findById(fileId);

        if (!fileDoc) {
            throw new Error('FILE_NOT_FOUND: File metadata not found');
        }

        const client = getStorageClient();
        let buffer;

        if (provider === 'minio') {
            const dataStream = await client.getObject(fileDoc.bucket, fileDoc.storageKey);
            return await streamToBuffer(dataStream);
        } else if (provider === 's3') {
            const response = await client.getObject({
                Bucket: fileDoc.bucket,
                Key: fileDoc.storageKey
            }).promise();
            return response.Body;
        }

    } catch (error) {
        logger.error(`[Storage] Failed to get file buffer: ${error.message}`);
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