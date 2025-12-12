import User from "../models/user-model.js";
import { logger } from "../../../shared/utils/logger.js";
import { sanitizeUserData } from "../utils/auth-utils.js";
import { checkPasswordStrength } from "../services/password-service.js";

export const getUserProfile = async (userId) => {
    const user = await User.findById(userId);
    if (!user || user.isDeleted) throw new Error('USER_NOT_FOUND: User not found');

    return sanitizeUserData({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        isEmailVerified: user.isEmailVerified,
        profile: user.profile,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    });
};

export const updateUserProfile = async (userId, updates) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND: User not found');

    if (updates.firstName) user.firstName = updates.firstName;
    if (updates.lastName) user.lastName = updates.lastName;
    if (updates.profile) {
        if (updates.profile.bio !== undefined) user.profile.bio = updates.profile.bio;
        if (updates.profile.avatar) {
             user.profile.avatar = updates.profile.avatar;
        }
        if (updates.profile.language) user.profile.language = updates.profile.language;
        if (updates.profile.timezone) user.profile.timezone = updates.profile.timezone;
    }

    const updatedUser = await user.save();

    logger.info(`User profile updated: ${updatedUser.email}`);
    return sanitizeUserData(updatedUser.toJSON ? updatedUser.toJSON() : updatedUser);
};

export const changeUserPassword = async (userId, currentPassword, newPassword) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND: User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new Error('USER_BAD_REQUEST: Current password is incorrect');

    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);
    return true;
};

export const deleteUserAccount = async (userId, password) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND: User not found');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new Error('USER_BAD_REQUEST: Password is incorrect');

    await user.softDelete();
    logger.info(`User account soft deleted: ${user.email}`);
    return true;
};

export const checkPasswordStrengthService = async (password) => {
    return checkPasswordStrength(password);
};

export const getUserStatsService = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND: User not found');

    const stats = {
        accountCreated: user.createdAt,
        lastLogin: user.lastLogin,
        emailVerified: user.isEmailVerified
    };
    return stats;
};

