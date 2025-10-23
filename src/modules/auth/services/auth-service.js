import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user-model.js';
import { generateAuthTokens, verifyToken } from './token-service.js';
import { sendEmail } from './email-service.js';
import { emailVerificationTemplate, emailVerificationResendTemplate } from '../templates/email-verification.js';
import { passwordResetTemplate } from '../templates/password-reset.js';
import { logger } from '../../../shared/utils/logger.js';
import { jwtConfig } from '../../../config/jwt.js';

export const registerUser = async ({ email, password, firstName, lastName }) => {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
        throw new Error('AUTH_CONFLICT: User already exists with this email address');
    }

    const user = new User({ email, password, firstName, lastName});
    await user.save();

    const emailVerificationToken = jwt.sign(
        {
            userId: user._id,
            type: 'email_verification',
            iss: jwtConfig.issuer,
            aud: jwtConfig.audience,
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: jwtConfig.verifyEmailExpiration }
    );

    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    try {
        const verificationLink = `${process.env.FRONTEND_URL || '#'}/verify-email?token=${emailVerificationToken}`;
        const htmlContent = emailVerificationTemplate(
            user.firstName, 
            verificationLink, 
            jwtConfig.verifyEmailExpiration
        );

        await sendEmail({
            to: user.email,
            subject: 'Verify Your Email - Memorise',
            html: htmlContent
        }, `email_verification_${user._id}`, 86400); 
    } catch (error) {
        logger.error('Failed to send verification email during registration:', error);
    }

    const tokens = generateAuthTokens(user);
    logger.info(`New user registered: ${user.email}`);

    return {
        user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isEmailVerified: user.isEmailVerified,
        },
        tokens
    };
};

export const verifyUserEmailByToken = async (token) => {
    let decoded;

    try {
        decoded = verifyToken(token, 'access');
    } catch (error) {
        throw new Error('AUTH_BAD_REQUEST: Invalid or expired verification token');
    }

    if (decoded.type !== 'email_verification') {
        throw new Error('AUTH_BAD_REQUEST: Invalid verification token type');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
        throw new Error('AUTH_NOT_FOUND: User associated with token not found');
    }

    if (user.isEmailVerified) {
        throw new Error('AUTH_BAD_REQUEST: Email is already verified');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    logger.info(`Email verified for user: ${user.email}`);
    return user.toJSON ? user.toJSON() : user;
};

export const resendVerificationEmailService = async (email) => {
    const user = await User.findByEmail(email);
    if (!user) {
        logger.warn(`Resend verification attempt for non-existent email: ${email}`);
        return true;
    }

    if (user.isEmailVerified) {
        throw new Error('AUTH_BAD_REQUEST: Email is already verified');
    }

    const emailVerificationToken = jwt.sign(
        {
            userId: user._id,
            type: 'email_verification',
            iss: jwtConfig.issuer,
            aud: jwtConfig.audience,
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: jwtConfig.verifyEmailExpiration }
    );

    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    try {
        const verificationLink = `${process.env.FRONTEND_URL || '#'}/verify-email?token=${emailVerificationToken}`;
        const htmlContent = emailVerificationResendTemplate(
            user.firstName, 
            verificationLink, 
            jwtConfig.verifyEmailExpiration
        );

        await sendEmail({
            to: user.email,
            subject: 'Verify Your Email - Memorise (Resend)',
            html: htmlContent
        }, `email_verification_${user._id}_${Date.now()}`, 86400);
        
    } catch (error) {
        logger.error(`Failed to resend verification email to ${email}:`, error);
        return false;
    }

    logger.info(`Verification email resent to: ${email}`);
    return true;
};

export const loginUser = async({ email, password }) => {
    const user = await User.findByEmail(email);
    if (!user) throw new Error('AUTH_UNAUTHORIZED: Invalid email or password');
    if (user.isLocked) throw new Error('AUTH_LOCKED: Account is temporarily locked due to too many failed login attempts');
    if (!user.isActive) throw new Error('AUTH_FORBIDDEN: Account is deactivated');
    if (!user.password) throw new Error('AUTH_UNAUTHORIZED: Please use social login for this account');

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        await user.incLoginAttempts();
        throw new Error('AUTH_UNAUTHORIZED: Invalid email or password');
    }

    if (user.loginAttempts > 0 || user.lockUntil) {
        await user.resetLoginAttempts();
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = generateAuthTokens(user);

    logger.info(`User logged in: ${user.email}`);
    return { user: user.toJSON ? user.toJSON() : user, tokens};
};

export const refreshAccessTokenService = async (refreshToken) => {
    let decoded;
    try {
        decoded = verifyToken(refreshToken, 'refresh');
    } catch (error) {
        throw new Error('AUTH_UNAUTHORIZED: Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive || user.isDeleted) {
        throw new Error('AUTH_UNAUTHORIZED: Invalid or expired refresh token');
    }

    const tokens = generateAuthTokens(user);
    return { user: user.toJSON ? user.toJSON() : user, tokens};
};

export const requestPasswordResetService = async (email) => {
    const user = await User.findByEmail(email);
    if (!user) {
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return true;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;

    try {
        const resetLink = `${process.env.FRONTEND_URL || '#'}/reset-password?token=${resetToken}`;
        const htmlContent = passwordResetTemplate(
            user.firstName, 
            resetLink, 
            '10 minutes'
        );

        await sendEmail({
            to: user.email,
            subject: 'Reset Your Password - Memorise',
            html: htmlContent
        }, `password_reset_${user._id}_${Date.now()}`, 600);
    } catch (error) {
        logger.error(`Failed to send password reset email to ${email}:`, error);
        throw new Error('EMAIL_ERROR: Failed to send password reset email.'); 
    }

    logger.info(`Password reset email initiated for: ${email}`);
    return true;

};