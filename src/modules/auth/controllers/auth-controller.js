import User from '../models/user-model.js';
import { generateAuthTokens, verifyToken } from '../services/token-service.js';
import { sendEmail } from '../services/email-service.js';
import { logger } from '../../../shared/utils/logger.js';
import { jwtConfig } from '../../../config/jwt.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Register a new user
 */
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists with this email address'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName
    });

    await user.save();

    // Generate email verification token
    const emailVerificationToken = jwt.sign(
      { 
        userId: user._id, 
        type: 'email_verification' 
      },
      process.env.JWT_ACCESS_SECRET,
      { 
        expiresIn: jwtConfig.verifyEmailExpiration,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      }
    );

    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    // Send verification email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify Your Email - Memorise',
        html: `
          <h2>Welcome to Memorise!</h2>
          <p>Hi ${user.firstName},</p>
          <p>Please click the link below to verify your email address:</p>
          <a href="${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Verify Email
          </a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        `
      }, `email_verification_${user._id}`, 86400); // 24 hours TTL
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate auth tokens
    const tokens = generateAuthTokens(user);

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified
      },
      tokens
    });

  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'User already exists with this email address'
      });
    }

    res.status(500).json({
      error: 'Internal server error during registration'
    });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (excluding deleted users)
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        error: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account is deactivated'
      });
    }

    // Check if user has password (not OAuth only)
    if (!user.password) {
      return res.status(401).json({
        error: 'Please use social login for this account'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate auth tokens
    const tokens = generateAuthTokens(user);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: user.isEmailVerified,
        profile: user.profile,
        preferences: user.preferences
      },
      tokens
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error during login'
    });
  }
};

/**
 * Verify email address
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify token
    const decoded = verifyToken(token, 'access');
    
    if (decoded.type !== 'email_verification') {
      return res.status(400).json({
        error: 'Invalid verification token'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        error: 'Email is already verified'
      });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    logger.info(`Email verified for user: ${user.email}`);

    res.json({
      message: 'Email verified successfully'
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    
    if (error.message === 'Invalid token') {
      return res.status(400).json({
        error: 'Invalid or expired verification token'
      });
    }

    res.status(500).json({
      error: 'Internal server error during email verification'
    });
  }
};

/**
 * Resend email verification
 */
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        error: 'Email is already verified'
      });
    }

    // Generate new verification token
    const emailVerificationToken = jwt.sign(
      { userId: user._id, type: 'email_verification' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: jwtConfig.verifyEmailExpiration }
    );

    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    // Send verification email
    await sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Memorise',
      html: `
        <h2>Verify Your Email</h2>
        <p>Hi ${user.firstName},</p>
        <p>Please click the link below to verify your email address:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}" 
           style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>This link will expire in 24 hours.</p>
      `
    }, `email_verification_${user._id}_${Date.now()}`, 86400);

    res.json({
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    logger.error('Resend verification email error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Forgot password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset Your Password - Memorise',
        html: `
          <h2>Reset Your Password</h2>
          <p>Hi ${user.firstName},</p>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
             style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      }, `password_reset_${user._id}_${Date.now()}`, 600); // 10 minutes TTL
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
      // Clear the reset token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
    }

    res.json({
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    logger.info(`Password reset successful for user: ${user.email}`);

    res.json({
      message: 'Password reset successfully'
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, 'refresh');

    // Find user
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const tokens = generateAuthTokens(user);

    res.json({
      message: 'Token refreshed successfully',
      tokens
    });

  } catch (error) {
    logger.error('Refresh token error:', error);
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req, res) => {
  try {
    // In a more advanced implementation, you might want to blacklist the token
    // For now, we'll just return success since JWT is stateless
    
    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

