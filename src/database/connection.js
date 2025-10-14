import mongoose from 'mongoose';
import { databaseConfig } from '../config/database.js';
import { logger } from '../shared/utils/logger.js';

let isConnected = false;

function setupEventListeners() {
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected.');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.info('MongoDB reconnected successfully.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });
}

/**
 * Connects to the MongoDB database with a retry mechanism.
 * @param {number} retries - Number of retry attempts.
 */
export const connectDatabase = async (retries = 5) => {
  if (isConnected) {
    logger.warn('Database is already connected');
    return;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(databaseConfig.uri, databaseConfig.options);
      isConnected = true;
      logger.info(`MongoDB connected - Host: ${mongoose.connection.host}`);
      setupEventListeners();
      return; 
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed:`, error.message);

      if (attempt === retries) {
        throw new Error('Failed to connect to MongoDB after multiple attempts');
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const closeDatabaseConnection = async () => {
  if (!isConnected) return;
  
  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

/**
 * Checks the current state of the MongoDB connection.
 * @returns {boolean} True if connected, false otherwise.
 */
export const checkDatabaseHealth = () => {
  return mongoose.connection.readyState === 1; 
};