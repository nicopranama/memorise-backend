import dotenv from 'dotenv';
import { connectDatabase, closeDatabaseConnection } from './database/connection.js';
import { createEmailTransporter, verifyEmailConnection, closeEmailConnection } from './modules/auth/services/email-service.js';
import { getRedisClient, createRedisClient } from './shared/services/redis-service.js';
import { logger } from './shared/utils/logger.js';
import app from './app.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close HTTP server
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger.info('HTTP server closed');
    }

    // Close database connections
    await closeDatabaseConnection();
    
    // Close email connection
    closeEmailConnection();
    
    // Close Redis connection
    try {
      const redis = getRedisClient();
      await redis.quit();
      logger.info('Redis connection closed');
    } catch (err) {
      logger.warn('Error closing Redis connection:', err.message);
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize services and start server
const startServer = async () => {
  try {
    logger.info('Starting Memorise Backend Server...');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Connect to MongoDB
    await connectDatabase();
    logger.info('Database connected successfully');

    // Initialize email service
    createEmailTransporter();
    if (process.env.NODE_ENV === 'production') {
      await verifyEmailConnection();
      logger.info('Email service initialized successfully');
    } else {
      logger.info('Email service initialized (verification skipped in development)');
    }

    // Test Redis connection
    try {
      const redis = createRedisClient();
      await redis.ping();
      logger.info('Redis connected successfully');
    } catch (err) {
      console.log(err);
      logger.warn('Redis connection failed:', err.message);
      logger.warn('Continuing without Redis (some features may be limited)');
    }

    // Start HTTP server
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`Health check available at http://${HOST}:${PORT}/health`);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', err);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
let server;
startServer().then((srv) => {
  server = srv;
}).catch((error) => {
  logger.error('Server startup failed:', error);
  process.exit(1);
});

