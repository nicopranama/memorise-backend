import bcrypt from 'bcrypt';
import { logger } from '../../../shared/utils/logger.js';

const SALT_ROUNDS = 12;

export const hashPassword = async (plainPassword) => {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        return await bcrypt.hash(plainPassword, salt);
    } catch (error) {
        logger.error('Error hashing password:', error);
        throw new Error('Failed to hash password');
    }
};

export const verifyPassword = async (plainPassword, hashedPassword) => {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        logger.error('Error comparing password:', error);
        throw new Error('Failed to verify password');
    }
};

export const checkPasswordStrength = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    const errors = [];
    if (password.length < minLength)
        errors.push(`Password must be at least ${minLength} characters long`);
    if (!hasUpperCase)
        errors.push('Password must contain at least one uppercase letter');
    if (!hasLowerCase)
        errors.push('Password must contain at least one lowercase letter');
    if (!hasNumbers)
        errors.push('Password must contain at least one number');
    if (!hasSpecialChar)
        errors.push('Password must contain at least one special character (@$!%*?&)');

    return {
        isValid: errors.length === 0,
        errors
    };
};