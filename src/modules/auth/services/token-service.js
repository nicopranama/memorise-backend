import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../../config/jwt.js';
import { logger } from '../../../shared/utils/logger.js';

const validateSecret = (secret, name, expectedLength) => {
  if (!secret) {
    throw new Error(`${name} is required but not set in environment variables`);
  }
  if (secret.length < expectedLength) {
    throw new Error(`${name} must be at least ${expectedLength} characters long`);
  }
  return secret;
};

const JWT_ACCESS_SECRET = validateSecret(
    process.env.JWT_ACCESS_SECRET, 
    'JWT_ACCESS_SECRET', 
    128
);

const JWT_REFRESH_SECRET = validateSecret(
    process.env.JWT_REFRESH_SECRET, 
    'JWT_REFRESH_SECRET', 
    128
);

if (JWT_ACCESS_SECRET === JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
}

logger.info('JWT secrets loaded and validated successfully.');

/**
 * Generates a JWT token.
 * @param {string} userId - The user's ID.
 * @param {string} expires - The token expiration time (e.g., '15m').
 * @param {string} secret - The secret key to sign the token.
 * @returns {string} The generated JWT.
 */
const generateToken = (userId, expires, secret) => {
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    iss: jwtConfig.issuer,
    aud: jwtConfig.audience,
  };
  return jwt.sign(payload, secret, {
    expiresIn: expires,
    algorithm: jwtConfig.algorithm,
  });
};

/**
 * Generates authentication tokens (access and refresh).
 * @param {object} user - The user object.
 * @returns {object} An object containing accessToken and refreshToken.
 */
export const generateAuthTokens = (user) => {
  const accessToken = generateToken(user.id, jwtConfig.accessExpiration, JWT_ACCESS_SECRET);
  const refreshToken = generateToken(user.id, jwtConfig.refreshExpiration, JWT_REFRESH_SECRET);
  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT to verify.
 * @param {string} type - The type of token ('access' or 'refresh').
 * @returns {Promise<object>} The decoded token payload.
 */
export const verifyToken = (token, type) => {
  const secret = type === 'access' ? JWT_ACCESS_SECRET : JWT_REFRESH_SECRET;
  try {
    const payload = jwt.verify(token, secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
    return payload;
  } catch (error) {
    logger.error(`Invalid token: ${error.message}`);
    throw new Error('Invalid token');
  }
};