import { logger } from '../../../shared/utils/logger.js';
import { transportConfig, emailDefaultFrom } from '../../../config/email.js';
import EmailLog from '../models/email-log.js';
import { getRedisClient } from '../../../shared/services/redis-service.js';
import nodemailer from 'nodemailer';

let transporter = null;
let isVerified = false;

export const createEmailTransporter = () => {
    if (transporter) {
        logger.warn('Email transporter singleton already exists.');
        return transporter;
    }

    transporter = nodemailer.createTransport(transportConfig);
    logger.info(`Email transporter created for host: ${transportConfig.host}`);
    return transporter;
};


export const verifyEmailConnection = async (retries = 3) => {
    if (isVerified) {
        logger.info('Email connection is already verified.');
        return true;
    }

    if (!transporter) {
        createEmailTransporter();
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await transporter.verify();
            isVerified = true;
            logger.info('Email transporter verified successfully.');
            return true;
        } catch (error) {
            logger.error(`Email verification attempt ${attempt}/${retries} failed:`, error.message);
            if (attempt === retries) {
                throw new Error('Failed to verify email transporter after multiple attempts.');
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return false;
};

export const sendEmail = async (options, idempotencyKey = null, ttlSeconds = 600, meta = {}) => {
    if (!transporter) {
        throw new Error('Email transporter not initialized. Ensure createEmailTransporter() is called on startup');
    }

    let redisAvailable = true;
    if (idempotencyKey) {
        try {
            const redis = getRedisClient();
            const lockAcquired = await redis.set(`idempotency:email:${idempotencyKey}`, 'locked', 'NX', 'EX', ttlSeconds);
            if (!lockAcquired) {
                logger.warn(`Duplicate email send prevented by Redis lock: ${idempotencyKey}`);
                return { status: 'skipped', reason: 'duplicate_redis'};
            }
        } catch (err) {
            redisAvailable = false;
            logger.warn(`Redis unavailable for idempotency lock, falling back to DB check. Error: ${err.message}`);
        }
    }

    if (idempotencyKey && !redisAvailable) {
        const logExists = await EmailLog.findOne({ idempotencyKey, status: 'sent'});
        if (logExists) {
            logger.warn(`Duplicate email send prevented by MongoDB fallback: ${idempotencyKey}`);
            return { status: 'skipped', reason: 'duplicate_db', messageId: logExists.messageId };
        }
    }

    if (!isVerified) {
        await verifyEmailConnection(1);
    }

    try {
        const info = await transporter.sendMail({
            from: emailDefaultFrom,
            ...options,
        });

        await EmailLog.create({
            to: options.to,
            subject: options.subject,
            status: 'sent',
            messageId: info.messageId,
            response: info.response,
            idempotencyKey: idempotencyKey || null,
            meta,
        });

        if (idempotencyKey && redisAvailable) {
            try {
                const redis = getRedisClient();
                await redis.set(`idempotency:email:${idempotencyKey}`, 'processed', 'EX', ttlSeconds);
            } catch (err) {
                logger.warn('Failed to set final idempotency key in Redis (non-fatal)');
            }
        }

        logger.info(`Email sent to ${options.to} with messageId: ${info.messageId}`);
        return { status: 'sent', info };
    } catch (error) {
        await EmailLog.create({
            to: options.to,
            subject: options.subject,
            status: 'failed',
            idempotencyKey: idempotencyKey || null,
            meta,
            error: { message: error.message, stack: error.stack, code: error.code },
        });

        if (idempotencyKey && redisAvailable) {
            try {
                const redis = getRedisClient();
                await redis.del(`idempotency:email:${idempotencyKey}`);
                logger.info(`Idempotency lock removed after failed send for key: ${idempotencyKey}`);
            } catch (err) {
                logger.warn('Failed to remove idempotency key from Redis after failure.')
            }
        }

        logger.error('Failed to send email:', error);
        throw error;
    }
};

export const closeEmailConnection = () => {
    if (transporter) {
        transporter.close();
        transporter = null;
        isVerified = false;
        logger.info('Email transporter connection pool closed.');
    }
};

export const checkEmailHealth = async () => {
    try {
        if (!transporter) {
            return { healthy: false, error: 'Transporter not initialized' };
        }
        await transporter.verify();
        return {
            healthy: true,
            host: transportConfig.host,
            port: transportConfig.port,
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    }
};