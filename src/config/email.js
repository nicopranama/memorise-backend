import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { logger } from '../shared/utils/logger.js';

dotenv.config();

const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM,
    NODE_ENV,
} = process.env;

const validateEmailConfig = () => {
    const required = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'];
    const missing = required.filter(field => !process.env[field]);

    if (missing.length > 0) {
        throw new Error(`Missing email config: ${missing.join(', ')}`);
    }
};

if (NODE_ENV === 'production') {
    validateEmailConfig();
}

const port = Number(EMAIL_PORT) || 587;
const isSecure = port === 465;

const transportConfig = {
    host: EMAIL_HOST,
    port,
    secure: isSecure,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: NODE_ENV === 'production',
        minVersion: 'TLSv1.2',
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
};

let transporter = null;
let isVerified = false;

export const createEmailTransporter = () => {
    if (transporter) {
        logger.warn('Email transporter already exists');
        return transporter;
    }

    transporter = nodemailer.createTransport(transportConfig);
    logger.info(`Email transporter created: ${EMAIL_HOST}:${port} (secure: ${isSecure})`);
    return transporter;
};

export const verifyEmailConnection = async (retries = 3) => {
    if (isVerified) {
        logger.info('Email connection already verified');
        return true;
    }

    if (!transporter) {
        createEmailTransporter();
    }

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await transporter.verify();
            isVerified = true;
            logger.info('Email transporter verified successfully');
            return true;
        } catch (error) {
            logger.error(`Email verification attempt ${attempt + 1}/${retries} failed:`, error.message);
            if (attempt === retries - 1){
                throw new Error('Failed to verify email transporter');
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return false;
};

export const sendEmail = async (options) => {
    if (!transporter) {
        throw new Error('Email transporter not initialized. Call createEmailTransporter() first.');
    }

    if (!isVerified) {
        await verifyEmailConnection();
    }

    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM || 'Memorise App <noreply@memorise.app>',
            ...options,
        });

        logger.info(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error('Failed to send email:', error);
        throw error;
    }
};

export const closeEmailConnection = () => {
    if (transporter) {
        transporter.close();
        transporter = null;
        isVerified = false;
        logger.info('Email transporter closed');
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
            host: EMAIL_HOST,
            port,
            secure: isSecure,
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    }
};

export const emailConfig = {
    from: EMAIL_FROM || 'Memorise App <noreply@memorise.app>',
    get transporter() {
        if (!transporter) createEmailTransporter();
        return transporter;
    },
    verifyConnection: verifyEmailConnection,
};

