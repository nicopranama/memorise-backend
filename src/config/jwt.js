import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    resetPasswordExpiration: process.env.JWT_RESET_PASSWORD_EXPIRATION || '10m',
    verifyEmailExpiration: process.env.JWT_VERIFY_EMAIL_EXPIRATION || '24h',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    issuer: process.env.JWT_ISSUER || 'memorise',
    audience: process.env.JWT_AUDIENCE || 'memorise-users',
};