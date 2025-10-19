import dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';
const databaseURI = isTest 
  ? process.env.MONGODB_URI_TEST 
  : process.env.MONGODB_URI;

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
  retryReads: true,
};

export const databaseConfig = {
  uri: databaseURI,
  options,
};