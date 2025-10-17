import dotenv from 'dotenv';

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

export const transportConfig = {
    host: EMAIL_HOST,
    port,
    secure: port === 465,
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

export const emailDefaultFrom = EMAIL_FROM || 'Memorise App <noreply@memorise.app>';