import crypto from 'crypto';
import { getStorageClient, storageConfig } from '../../../config/storage.js';
import { logger } from '../../../shared/utils/logger.js';
import File from '../models/file.model.js';
import {
  cacheFileMetadata,
  getCachedFileMetadata,
  cachePresignedUrl,
  getCachedPresignedUrl,
  invalidateFileCache,
  invalidateMultipleFiles,
  acquireIdempotencyLock,
} from '../../../shared/utils/cache.js';

const client = getStorageClient();
const { provider, bucket, region } = storageConfig;

export const initializeStorage = async () => {
    try {
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