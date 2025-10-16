import AWS from 'aws-sdk';
import { Client as MinioClient } from 'minio';
import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger.js';

dotenv.config();

const provider = process.env.STORAGE_PROVIDER || 'minio';
const bucket = process.env.STORAGE_BUCKET || 'memorise-files';
const region = process.env.AWS_REGION || 'ap-southeast-3';

const validateConfig = (config, requiredFields) => {
    const missing = requiredFields.filter(f => !config[f]);
    if (missing.length > 0) {
        throw new Error(`Missing required storage config: ${missing.join(', ')}`);
    }
};

let storageClient = null;
let endpointInfo = null;

if (provider === 'minio') {
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
    }

    storageClient = new MinioClient(minioConfig);
    endpointInfo = `${minioConfig.useSSL ? 'https' : 'http'}://${minioConfig.endPoint}:${minioConfig.port}`;
    logger.info(`Storage provider configured: MinIO at ${endpointInfo}`);

} else if (provider === 's3') {
    const s3Config = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: region,
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

    endpointInfo = region;
    logger.info(`Storage provider configured: AWS S3 in ${region}`);
} else {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
}

export const storageConfig = { provider, bucket, region, endpoint: endpointInfo };

export const getStorageClient = () => {
    if (!storageClient) throw new Error('Storage client not initialized');
    return storageClient;
};
