import { getRedisClient } from '../services/redis-service.js';
import { logger } from './logger.js';

const CACHE_PREFIX_FILE = 'file:';
const CACHE_PREFIX_URL = 'url:';
const FILE_METADATA_TTL = 60 * 10;
const URL_TTL = 60 * 5;
const IDEMPOTENCY_PREFIX = 'idempotency:';

export const cacheFileMetadata = async (fileDoc) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_FILE}${fileDoc._id}`;
        await client.setex(key, FILE_METADATA_TTL, JSON.stringify(fileDoc));
        logger.debug(`Cached file metadata: ${key}`);
    } catch (error) {
        logger.error(`Redis cacheFileMetadata failed: ${error.message}`);
    }
};

export const getCachedFileMetadata = async (fileId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_FILE}${fileId}`;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error(`Redis getCachedFileMetadata failed: ${error.message}`);
        return null;
    }
};

export const cachePresignedUrl = async (fileId, url, ttl = URL_TTL) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_URL}${fileId}`;
        await client.setex(key, ttl, url);
        logger.debug(`Cached presigned URL: ${key}`);
    } catch (error) {
        logger.error(`Redis cachePresignedUrl failed: ${error.message}`);
    }
};

export const getCachedPresignedUrl = async (fileId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_URL}${fileId}`;
        return await client.get(key);
    } catch (error) {
        logger.error(`Redis getCachedPresignedUrl failed: ${error.message}`);
        return null;
    }
};

export const invalidateFileCache = async (fileId) => {
    if (!fileId) {
        logger.warn('InvalidateFileCache called with no fileId');
        return;
    }
    await invalidateMultipleFiles([fileId]);
};

export const invalidateMultipleFiles = async (fileIds) => {
    try {
        if (!fileIds?.length) {
            logger.warn('No fileIds provided for cache invalidation');
            return;
        }
        const client = getRedisClient();
        const keys = fileIds.flatMap(id => [
            `${CACHE_PREFIX_FILE}${id}`,
            `${CACHE_PREFIX_URL}${id}`
        ]);

        if (keys.length > 0) {
            await client.del(keys);
            logger.debug(`Invalidated cache for files: ${fileIds.join(', ')}`);
        }
    } catch (error) {
        logger.error(`Redis invalidateMultipleFiles failed: ${error.message}`);
    }
};

export const acquireIdempotencyLock = async (key, ttl = 3600) => {
    if (!key) {
        logger.warn('No idempotencyKey provided for lock acquisition');
        return false;
    }

    try {
        const client = getRedisClient();
        const redisKey = `${IDEMPOTENCY_PREFIX}${key}`;
        const result = await client.set(redisKey, 'locked', 'NX', 'EX', ttl);
        return result === 'OK';
    } catch (error) {
        logger.error(`Redis checkIdempotency failed: ${error.message}`);
        return false;
    }
};

export const releaseIdempotencyLock = async (key) => {
    try {
        const client = getRedisClient();
        await client.del(`${IDEMPOTENCY_PREFIX}${key}`);
    } catch (error) {
        logger.error(`Redis releaseIdempotencyLock failed: ${error.message}`);
    }
};

