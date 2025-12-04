import { Resend } from 'resend';
import { logger } from '../../../shared/utils/logger.js';
import EmailLog from '../models/email-log.js';
import { getRedisClient } from '../../../shared/services/redis-service.js';


const resend = new Resend(process.env.RESEND_API_KEY);
const emailFrom = process.env.EMAIL_FROM || 'Memorise App <no-reply@memorise.my.id>';

export const createEmailTransporter = () => {
    logger.info('[Email] Using Resend API (HTTP) - No transporter needed.');
};

export const verifyEmailConnection = async () => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is missing');
    }
    logger.info('[Email] Resend API Key configured.');
    return true;
};

export const closeEmailConnection = () => {};

export const sendEmail = async (options, idempotencyKey = null, ttlSeconds = 600, meta = {}) => {
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

    try {
        const data = await resend.emails.send({
            from: emailFrom,
            to: options.to,
            subject: options.subject,
            html: options.html 
        });

        if (data.error) {
            throw new Error(data.error.message);
        }

        await EmailLog.create({
            to: options.to,
            subject: options.subject,
            status: 'sent',
            messageId: data.data?.id, 
            response: 'Resend API Success',
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

        logger.info(`Email sent to ${options.to} with messageId: ${data.data?.id}`);
        return { status: 'sent', messageId: data.data?.id };

    } catch (error) {
        await EmailLog.create({
            to: options.to,
            subject: options.subject,
            status: 'failed',
            idempotencyKey: idempotencyKey || null,
            meta,
            error: { message: error.message, stack: error.stack },
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

        logger.error(`[Email] Failed to send: ${error.message}`);
        return { status: 'failed', error: error.message };
    }
};

export const checkEmailHealth = async () => {
    return { healthy: true, provider: 'resend' };
};