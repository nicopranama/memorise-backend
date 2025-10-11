import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

/* Cara pemakaian:
   import { logger } from '../shared/utils/logger.js';
   logger.info('Server started on port 5000);
   logger.error('Error connecting to database');
   Note: Production hanya menampilkan log dengan level info, warn, error,
   Development menampilkan semua level log (termasuk debug)
*/

const logDirectory = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const serviceName = process.env.APP_NAME || 'memorise-app';

const {
    combine,
    timestamp,
    printf,
    colorize,
    json,
    errors,
    label,
    splat,
    align,
} = winston.format;

const devFormat = combine(
    colorize(),
    label({ label: serviceName }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    align(),
    splat(),
    printf(({ timestamp, level, message, label, stack }) => {
        return `${timestamp} [${label}] ${level}: ${stack || message}`;
    })
);

const prodFormat = combine(
    label({ label: serviceName }),
    timestamp(),
    errors({ stack: true }),
    splat(),
    json()
);

const isProduction = process.env.NODE_ENV === 'production';
const currentFormat = isProduction ? prodFormat : devFormat;
const transports = [new winston.transports.Console()];

if (isProduction && process.env.LOG_FILE_ENABLED === 'true') {
    transports.push(
        new winston.transports.DailyRotateFile({
            filename: path.join(logDirectory, '%DATE%-combined.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '14d',
        }),
        new winston.transports.DailyRotateFile({
            filename: path.join(logDirectory, '%DATE%-error.log'),
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '14d',
        })
    );
}

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: currentFormat,
    transports,
    exceptionHandlers: [
        new winston.transports.DailyRotateFile({
            filename: path.join(logDirectory, '%DATE%-exceptions.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        }),
    ],
    rejectionHandlers: [
        new winston.transports.DailyRotateFile({
            filename: path.join(logDirectory, '%DATE%-rejections.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        }),
    ],
    exitOnError: false,
});

export const loggerStream = {
    write: (message) => logger.http(message.trim()),
};