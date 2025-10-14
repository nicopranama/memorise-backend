import AWS from 'aws-sdk';
import { Client as MinioClient } from 'minio';
import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger.js';

dotenv.config();
const provider = process.env.STORAGE_PROVIDER || 'minio';

const validateConfig = (config, requireFields) => {
    const missing = requireFields.filter(field => !config[field]);
    if (missing.length > 0) {
        throw new Error(`Missing required storage config: ${missing.join(', ')}`);
    }
};

let storageClient = null;
let storageConfig = {};

if  (provider === 'minio') {
    const minioConfig = {
        endPoint: process.env.STORAGE_ENDPOINT?.replace(/^https?:\/\//, '') || 'localhost',
        port: Number(process.env.STORAGE_PORT) || 9000,
        accessKey: process.env.STORAGE_ACCESS_KEY,
        secretKey: process.env.STORAGE_SECRET_KEY,
        useSSL: process.env.STORAGE_USE_SSL === 'true',
    };

    if (process.env.NODE_ENV === 'production') {
        validateConfig(minioConfig, ['accessKey', 'secretKey']);
    } else {
        minioConfig.accessKey = minioConfig.accessKey || 'minioadmin';
        minioConfig.secretKey = minioConfig.secretKey || 'minioadmin';
        logger.warn('Using default MinIO credentials for development');
    }

    storageClient = new MinioClient(minioConfig);
    storageConfig = {
        provider: 'minio',
        bucket: process.env.STORAGE_BUCKET || 'memorise-files',
        client: storageClient,
        endpoint: `${minioConfig.useSSL ? 'https' : 'http'}://${minioConfig.endPoint}:${minioConfig.port}`,
    };

    logger.info(`Storage: MinIO at ${storageConfig.endpoint}`);
} else if (provider === 's3') {
    const s3Config = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'ap-southeast-3',
    };

    if (process.env.NODE_ENV === 'production') {
        validateConfig(s3Config, ['accessKeyId', 'secretAccessKey']);
    }

    AWS.config.update(s3Config);

    storageClient = new AWS.S3({
        apiVersion: '2006-03-01',
        signatureVersion: 'v4',
        ...(process.env.S3_ENDPOINT && {
            endpoint: process.env.S3_ENDPOINT,
            s3ForcePathStyle: true,
        }),
    });

    storageConfig = {
        provider: 's3',
        bucket: process.env.STORAGE_BUCKET || 'memorise-files',
        region: s3Config.region,
        client: storageClient,
    };

    logger.info(`Storage: AWS S3 in ${s3Config.region}`);
} else {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}. Use 'minio' or 's3'.`);
}

export const checkStorageHealth = async () => {
    try {
        const bucket = storageConfig.bucket;

        if (provider === 'minio') {
            const exists = await storageClient.bucketExists(bucket);
            if (!exists) {
                logger.warn(`MinIO bucket '${bucket}' does not exist`);
                return { healthy: false, error: 'Bucket not found'};
            }
        } else if (provider === 's3') {
            await storageClient.headBucket({ Bucket: bucket }).promise();
        }

        return {
            healthy: true,
            provider,
            bucket,
            endpoint: storageConfig.endpoint || storageConfig.region
        };
    } catch (error) {
        logger.error('Storage health check failed:', error.message);
        return {
            healthy: false,
            provider,
            error: error.message
        };
    }
};

export const initializeStorage = async () => {
  if (provider !== 'minio') return;

  try {
    const bucket = storageConfig.bucket;
    const exists = await storageClient.bucketExists(bucket);
    
    if (!exists) {
      await storageClient.makeBucket(bucket, storageConfig.region || 'ap-southeast-3');
      logger.info(`Created MinIO bucket: ${bucket}`);
    } else {
      logger.info(`MinIO bucket exists: ${bucket}`);
    }
  } catch (error) {
    logger.error('Failed to initialize storage:', error);
    throw error;
  }
};

export { storageConfig, storageClient };