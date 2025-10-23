import { errorResponse } from '../utils/response-utils.js';
import { logger } from '../utils/logger.js';

const prefixMap = {
    AUTH_CONFLICT: 409,
    AUTH_UNAUTHORIZED: 401,
    AUTH_BAD_REQUEST: 400,
    AUTH_LOCKED: 423,
    AUTH_FORBIDDEN: 403,
    AUTH_NOT_FOUND: 404,
    USER_NOT_FOUND: 404,
    USER_BAD_REQUEST: 400,
};

const internalErrorPrefixes = ['DB_ERROR', 'EMAIL_ERROR', 'SERVICE_ERROR'];

export const globalErrorHandler = (err, req, res, next) => {
    logger.error('Global Error Handler caught:', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        ...(req.user && { userId: req.user._id }),
    });

    let statusCode = 500;
    let message = 'An unexpected error occurred';
    const details = {};
    let messageCleaned = false;

    if (err instanceof Error) {
        const originalMessage = err.message || 'Unknown error';
        message = originalMessage;

        const explicitStatusCode = err.statusCode || err.status;
        if (explicitStatusCode && typeof explicitStatusCode === 'number' && explicitStatusCode >= 400 && explicitStatusCode < 600) {
            statusCode = explicitStatusCode;
            messageCleaned = true;
        } else {
            const prefixEntry = Object.entries(prefixMap).find(([prefix]) =>
                originalMessage.startsWith(prefix)
            );

            if (prefixEntry) {
                const [prefix, code] = prefixEntry;
                statusCode = code;
                message = originalMessage.replace(`${prefix}: `, '');
                messageCleaned = true;
            }
        }

        if (!messageCleaned) {
            const isInternal = internalErrorPrefixes.some((prefix) =>
                originalMessage.startsWith(prefix)
            );

            if (isInternal) {
                message = 'An internal service error occurred.';
                messageCleaned = true;
            }
        }

        if (process.env.NODE_ENV === 'development') {
            details.stack = err.stack;
            if (originalMessage !== message) {
                details.originalMessage = originalMessage;
            }
        }
    }
    return errorResponse(res, statusCode, message, details);
};