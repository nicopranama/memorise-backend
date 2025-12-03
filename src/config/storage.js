import AWS from 'aws-sdk';
import { Client as MinioClient } from 'minio';
import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger.js';

dotenv.config();

const activeProvider = process.env.ACTIVE_PROVIDER || 'minio';

const requireEnv = (value, keyName) => {
    if (!value) {
      throw new Error(`CRITICAL ERROR: Missing environment variable '${keyName}' for provider '${activeProvider}'`);
    }
    return value;
};

let storageClient = null;
let configInfo = {};

if (activeProvider === 'minio') {
    const minioConfig = {
        endPoint: process.env.MINIO_ENDPOINT?.replace(/^https?:\/\//, '') || 'localhost',
        port: Number(process.env.MINIO_PORT) || 9000,
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        useSSL: process.env.MINIO_USE_SSL === 'true',
    };

    storageClient = new MinioClient(minioConfig);
    configInfo = {
        provider: 'minio',
        bucket: process.env.MINIO_BUCKET || 'memorise-files',
        region: 'local',
        endpoint: `${minioConfig.useSSL ? 'https' : 'http'}://${minioConfig.endPoint}:${minioConfig.port}`
    };

    logger.info('[STORAGE] Using MinIO (Local)');

} else if (activeProvider === 'supabase') {
    const supabaseConfig = {
        accessKeyId: requireEnv(process.env.SUPABASE_ACCESS_KEY, 'SUPABASE_ACCESS_KEY'),
        secretAccessKey: requireEnv(process.env.SUPABASE_SECRET_KEY, 'SUPABASE_SECRET_KEY'),
        endpoint: requireEnv(process.env.SUPABASE_ENDPOINT, 'SUPABASE_ENDPOINT'),
        region: process.env.SUPABASE_REGION || 'ap-southeast-1',
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
    };

    storageClient = new AWS.S3(supabaseConfig);
    configInfo = {
        provider: 's3',
        bucket: requireEnv(process.env.SUPABASE_BUCKET, 'SUPABASE_BUCKET'),
        region: supabaseConfig.region,
        endpoint: supabaseConfig.endpoint
    }

    logger.info('[STORAGE] Using Supabase (Cloud)');

} else {
    throw new Error(`Unsupported ACTIVE_PROVIDER: ${activeProvider}`);
}

export const storageConfig = configInfo;

export const getStorageClient = () => {
    if (!storageClient) throw new Error('Storage client not initialized');
    return storageClient;
};
