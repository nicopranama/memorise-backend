import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger.js';

dotenv.config();

const {
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
} = process.env;

if (!REDIS_HOST) {
    logger.warn('REDIS_HOST is not set. Redis client will not be initialized.');
}

export const redisOptions = {
    port: Number(REDIS_PORT) || 6379,
    host: REDIS_HOST || 'localhost',
    password: REDIS_PASSWORD || undefined,
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,

    ...(REDIS_HOST && REDIS_HOST !== 'localhost' ? {
        tls: {
            rejectUnauthorized: true
        }
    } : {}),

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