import Redis from 'ioredis';
import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger.js';

dotenv.config();

const {
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
    NODE_ENV,
} = process.env;

if (!REDIS_HOST) {
    logger.warn('REDIS_HOST is not set. Redis client will not be initialized.');
}

const redisOptions = {
    port: Number(REDIS_PORT) || 6379,
    host: REDIS_HOST || 'localhost',
    password: REDIS_PASSWORD || undefined,
    connectionTimeout: 10000,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,

    retryStrategy(times) {
        if (times > 10) {
            logger.error('Redis max retry attempts reached');
            return null;
        }
        const delay = Math.min(times * 1000, 10000);
        logger.warn(`Redis retry attempt ${times} in ${delay}ms`);
        return delay;
    },

    reconnectOnError(err) {
        const targetError = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        if (targetError.some(e => err.message.includes(e))) {
            logger.warn(`Redis reconnecting due to error: ${err.message}`);
            return true;
        }
        return false;
    },
};

let redisClient = null;
let redisConnected = false;

export const createRedisClient = () => {
    if (redisClient) {
        logger.warn('Redis client already exists');
        return redisClient;
    }

    redisClient = new Redis(redisOptions);

    redisClient.on('connect', () => {
        logger.info(`Redis connected - Host: ${REDIS_HOST}, Port: ${REDIS_PORT}`);
    });

    redisClient.on('ready', () => {
        redisConnected = true;
        logger.info('Redis client ready to use');
    });

    redisClient.on('error', (err) => {
        redisConnected = false;
        logger.error(`Redis error:`, err.message);
    });

    redisClient.on('close', () => {
        redisConnected = false;
        logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', (delay) => {
        logger.warn(`Redis reconnecting in ${delay}ms`);
    });

    redisClient.on('end', () => {
        redisConnected = false;
        logger.warn('Redis connection ended');
    });

    return redisClient;
};

export const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis client not initialized. Call createRedisClient() first.');
    }
    return redisClient;
};

export const closeRedisConnection = async () => {
    if (!redisClient) return;

    try {
        await redisClient.quit();
        redisClient = null;
        redisConnected = false;
        logger.info('Redis connection closed');
    } catch (error) {
        logger.error('Error closing Redis connection:', error);
        redisClient.disconnect();
        throw error;
    }
};

export const checkRedisHealth = async () => {
    if (!redisClient || !redisConnected) {
        return { status: 'disconnected', healthy: false};
    }

    try {
        const pong = await redisClient.ping();
        return {
            status: 'connected',
            healthy: pong === 'PONG',
            host: REDIS_HOST,
            port: REDIS_PORT
        };
    } catch (error) {
        logger.error('Redis health check failed:', error);
        return { status: 'error', healthy: false, error: error.message };
    }
};

export { redisClient, redisOptions };