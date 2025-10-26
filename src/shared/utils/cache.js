import { getRedisClient } from '../services/redis-service.js';
import { logger } from './logger.js';

const CACHE_PREFIX_FILE = 'file:';
const CACHE_PREFIX_URL = 'url:';
const CACHE_PREFIX_DECK = 'deck:';
const CACHE_PREFIX_FOLDER = 'folder:';
const CACHE_PREFIX_CARD = 'card:';
const CACHE_PREFIX_STATS = 'stats:';
const CACHE_PREFIX_HOME = 'home:';

const FILE_METADATA_TTL = 60 * 10;
const URL_TTL = 60 * 5;
const DECK_TTL = 60 * 15; // 15 minutes
const FOLDER_TTL = 60 * 30; // 30 minutes
const CARD_TTL = 60 * 10; // 10 minutes
const STATS_TTL = 60 * 5; // 5 minutes
const HOME_TTL = 60 * 10; // 10 minutes
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

export const invalidateFileCache = async (fileId) => {
    if (!fileId) {
        logger.warn('InvalidateFileCache called with no fileId');
        return;
    }
    await invalidateMultipleFiles([fileId]);
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

// ===== DECK CACHE FUNCTIONS =====

export const cacheDeck = async (deckId, deckData) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_DECK}${deckId}`;
        await client.setex(key, DECK_TTL, JSON.stringify(deckData));
        logger.debug(`Cached deck: ${key}`);
    } catch (error) {
        logger.error(`Redis cacheDeck failed: ${error.message}`);
    }
};

export const getCachedDeck = async (deckId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_DECK}${deckId}`;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error(`Redis getCachedDeck failed: ${error.message}`);
        return null;
    }
};

export const invalidateDeckCache = async (deckId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_DECK}${deckId}`;
        await client.del(key);
        logger.debug(`Invalidated deck cache: ${key}`);
    } catch (error) {
        logger.error(`Redis invalidateDeckCache failed: ${error.message}`);
    }
};

// ===== FOLDER CACHE FUNCTIONS =====

export const cacheFolder = async (folderId, folderData) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_FOLDER}${folderId}`;
        await client.setex(key, FOLDER_TTL, JSON.stringify(folderData));
        logger.debug(`Cached folder: ${key}`);
    } catch (error) {
        logger.error(`Redis cacheFolder failed: ${error.message}`);
    }
};

export const getCachedFolder = async (folderId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_FOLDER}${folderId}`;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error(`Redis getCachedFolder failed: ${error.message}`);
        return null;
    }
};

export const invalidateFolderCache = async (folderId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_FOLDER}${folderId}`;
        await client.del(key);
        logger.debug(`Invalidated folder cache: ${key}`);
    } catch (error) {
        logger.error(`Redis invalidateFolderCache failed: ${error.message}`);
    }
};

// ===== CARD CACHE FUNCTIONS =====

export const cacheCardsByDeck = async (deckId, cardsData) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_CARD}deck:${deckId}`;
        await client.setex(key, CARD_TTL, JSON.stringify(cardsData));
        logger.debug(`Cached cards for deck: ${key}`);
    } catch (error) {
        logger.error(`Redis cacheCardsByDeck failed: ${error.message}`);
    }
};

export const getCachedCardsByDeck = async (deckId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_CARD}deck:${deckId}`;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error(`Redis getCachedCardsByDeck failed: ${error.message}`);
        return null;
    }
};

export const invalidateCardsCache = async (deckId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_CARD}deck:${deckId}`;
        await client.del(key);
        logger.debug(`Invalidated cards cache for deck: ${key}`);
    } catch (error) {
        logger.error(`Redis invalidateCardsCache failed: ${error.message}`);
    }
};

// ===== STATS CACHE FUNCTIONS =====

export const cacheStats = async (type, id, statsData) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_STATS}${type}:${id}`;
        await client.setex(key, STATS_TTL, JSON.stringify(statsData));
        logger.debug(`Cached stats: ${key}`);
    } catch (error) {
        logger.error(`Redis cacheStats failed: ${error.message}`);
    }
};

export const getCachedStats = async (type, id) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_STATS}${type}:${id}`;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error(`Redis getCachedStats failed: ${error.message}`);
        return null;
    }
};

export const invalidateStatsCache = async (type, id) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_STATS}${type}:${id}`;
        await client.del(key);
        logger.debug(`Invalidated stats cache: ${key}`);
    } catch (error) {
        logger.error(`Redis invalidateStatsCache failed: ${error.message}`);
    }
};

// ===== HOME CACHE FUNCTIONS =====

export const cacheHomeData = async (userId, homeData) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_HOME}${userId}`;
        await client.setex(key, HOME_TTL, JSON.stringify(homeData));
        logger.debug(`Cached home data: ${key}`);
    } catch (error) {
        logger.error(`Redis cacheHomeData failed: ${error.message}`);
    }
};

export const getCachedHomeData = async (userId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_HOME}${userId}`;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error(`Redis getCachedHomeData failed: ${error.message}`);
        return null;
    }
};

export const invalidateHomeCache = async (userId) => {
    try {
        const client = getRedisClient();
        const key = `${CACHE_PREFIX_HOME}${userId}`;
        await client.del(key);
        logger.debug(`Invalidated home cache: ${key}`);
    } catch (error) {
        logger.error(`Redis invalidateHomeCache failed: ${error.message}`);
    }
};

// ===== BULK INVALIDATION =====

export const invalidateUserCache = async (userId) => {
    try {
        const client = getRedisClient();
        const patterns = [
            `${CACHE_PREFIX_DECK}*`,
            `${CACHE_PREFIX_FOLDER}*`,
            `${CACHE_PREFIX_CARD}*`,
            `${CACHE_PREFIX_STATS}*`,
            `${CACHE_PREFIX_HOME}${userId}`
        ];
        
        for (const pattern of patterns) {
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
                logger.debug(`Invalidated cache pattern: ${pattern}`);
            }
        }
    } catch (error) {
        logger.error(`Redis invalidateUserCache failed: ${error.message}`);
    }
};

