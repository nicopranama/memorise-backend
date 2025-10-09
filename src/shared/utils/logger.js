const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * Winston Logger Utility
 * 
 * Digunakan untuk mencatat log secara konsisten di semua microservice.
 * Logger ini otomatis menyesuaikan format antara development dan production.
 * 
 * Cara Penggunaan:
 * --------------------------------------------------------------
 * Import di file service mana pun:
 *    const logger = require("@memorise/shared-utils/logger");
 * 
 * Gunakan level log sesuai kebutuhan:
 *    logger.info("Server started on port %d", port);
 *    logger.warn("Request took too long for user %s", userId);
 *    logger.error("Database connection failed: %o", error);
 *    logger.debug("Incoming payload: %o", payload);
 * 
 * Level log yang tersedia:
 *    - logger.error()  : Error dan exception
 *    - logger.warn()   : Peringatan yang tidak menghentikan proses
 *    - logger.info()   : Informasi umum (default)
 *    - logger.debug()  : Log detail untuk debugging
 * 
 * Environment variables:
 *    SERVICE_NAME  : nama microservice (misal: "auth-service")
 *    NODE_ENV      : development | production
 *    LOG_LEVEL     : debug | info | warn | error
 * 
 * Output:
 *    - Dev mode: log berwarna di console
 *    - Prod mode: log dalam format JSON
 *    - Semua log disimpan di folder /logs:
 *         combined.log   → semua log
 *         error.log      → log error
 *         exceptions.log → error tidak tertangani
 *         rejections.log → promise rejection tanpa catch
 * 
 * Dokumentasi lengkap tersedia di:
 *    /docs/LOGGER_DOCUMENTATION.md
 */

const logDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, json, errors, label, splat, align } = winston.format;

const serviceLabel = process.env.SERVICE_NAME || 'unknown-service';

const devFormat = combine(
    colorize(),
    label({ label: serviceLabel }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    splat(),
    printf(({ timestamp, level, message, label, stack}) => {
        return '[${timestamp}] [${label}] ${level}: ${stack || message}';
    })
);

const prodFormat = combine(
    label({ label: serviceLabel}),
    timestamp(),
    errors({ stack: true }),
    splat(),
    json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })
    ],
});

module.exports = logger;