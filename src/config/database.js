import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger.js';

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';
const databaseURI = isTest ? process.env.MONGODB_URI_TEST : process.env.MONGODB_URI;

if (!databaseURI) {
    throw new Error(`MongoDB URI not configured for environment: ${env}`);
}

const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    retryWrites: true,
    retryReads: true
};

let databaseConnected = false;

export const connectDatabase = async (retries = 5) => {
    if (databaseConnected) {
        logger.warn('Database already connected');
        return;
    }

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await mongoose.connect(databaseURI, options);
            databaseConnected = true;
            logger.info(`MongoDB connected [${env}] - Host: ${mongoose.connection.host}`);
            setupEventListeners();
            return;
        } catch (error){
            logger.error(`MongoDB connection attempt ${attempt + 1}/{retries} failed:`. error.message);

            if (attempt === retries - 1){
                throw new Error(`Failed to connect to MongoDB after ${retries} attempts`);
            }
            await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000))); 
        }
    }
};

function setupEventListeners() {
    mongoose.connection.on('disconnected', () => {
        databaseConnected = false;
        logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
        databaseConnected = true;
        logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
        logger.error('MongoDB error: ', err);
    });
}

export const closeDatabaseConnection = async () => {
    if (!databaseConnected) return;

    try {
        await mongoose.connection.close();
        databaseConnected = false;
        logger.info('MongoDB connection closed');
    } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        throw error;
    }
};

export const checkDatabaseHealth  = () => {
    return mongoose.connection.readyState === 1;
};

export const databaseConfig = { databaseURI, options };