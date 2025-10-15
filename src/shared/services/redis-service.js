import Redis from 'ioredis';
import { redisOptions } from '../../config/redis.js';
import { logger } from '../shared/utils/logger.js';

let redisClient = null;
let isConnected = false;

export const createRedisClient = () => {
  if (redisClient) {
    logger.warn('Redis client singleton already exists.');
    return redisClient;
  }

  redisClient = new Redis(redisOptions);

  redisClient.on('connect', () => {
    logger.info(`Redis connected - Host: ${redisOptions.host}`);
  });

  redisClient.on('ready', () => {
    isConnected = true;
    logger.info('Redis client is ready to accept commands.');
  });

  redisClient.on('error', (err) => {
    logger.error(`Redis error:`, err.message);
  });

  redisClient.on('close', () => {
    isConnected = false;
    logger.warn('Redis connection has been closed.');
  });

  redisClient.on('reconnecting', (delay) => {
    isConnected = false;
    logger.warn(`Redis is reconnecting in ${delay}ms...`);
  });

  redisClient.on('end', () => {
    isConnected = false;
    logger.warn('Redis connection has ended and will not reconnect.');
  });

  return redisClient;
};

/**
 * Returns the existing Redis client instance.
 * @throws {Error} if the client has not been initialized.
 * @returns {Redis.Redis} The ioredis client instance.
 */
export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call createRedisClient() during application startup.');
  }
  return redisClient;
};

export const closeRedisConnection = async () => {
  if (!redisClient) return;

  try {
    await redisClient.quit(); 
    redisClient = null;
    isConnected = false;
    logger.info('Redis connection closed gracefully.');
  } catch (error) {
    logger.error('Error during Redis graceful shutdown:', error);
    redisClient.disconnect();
    redisClient = null;
    isConnected = false;
  }
};

/**
 * Actively checks the health of the Redis connection by sending a PING command.
 * @returns {Promise<object>} An object with health status.
 */
export const checkRedisHealth = async () => {
  if (!redisClient || !isConnected) {
    return { status: 'disconnected', healthy: false };
  }

  try {
    const pong = await redisClient.ping();
    return {
      status: 'connected',
      healthy: pong === 'PONG',
      host: redisOptions.host,
    };
  } catch (error) {
    logger.error('Redis health check PING failed:', error);
    return { status: 'error', healthy: false, error: error.message };
  }
};