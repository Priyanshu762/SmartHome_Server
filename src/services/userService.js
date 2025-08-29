import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateTokenPair, verifyRefreshToken } from '../helpers/jwt.js';
import { hashPassword, comparePassword } from '../helpers/password.js';
import responseHelpers from '../helpers/response.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * User Service
 * Handles user-related business logic including authentication, profile management,
 * and user data operations
 */
class UserService {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Object} - Created user and tokens
   */
  async register(userData) {
    try {
      const { email, password, name, phone } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ 
        email: email.toLowerCase()
      });

      if (existingUser) {
        throw new AppError('Email already registered', 409);
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = new User({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        phone,
        role: 'user',
        isActive: true,
        isVerified: false,
        profile: {
          timezone: 'UTC',
          language: 'en',
          theme: 'light',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
        },
        security: {
          twoFactorEnabled: false,
          loginAttempts: 0,
          lockUntil: null,
        },
      });

      await user.save();

      // Generate tokens
  const tokens = generateTokenPair(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info(`New user registered: ${user.email}`, {
        userId: user._id,
        email: user.email,
        role: user.role,
      });

      // Return user without password
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.security;

      return {
        user: userResponse,
        tokens,
      };
    } catch (error) {
      logger.error('User registration failed', {
        error: error.message,
        email: userData.email,
      });
      throw error;
    }
  }

  /**
   * Authenticate user login
   * @param {Object} credentials - User login credentials
   * @returns {Object} - User and tokens
   */
  async login(credentials) {
    try {
      const { email, password } = credentials;

      // Find user by email
      const user = await User.findOne({ 
        email: email.toLowerCase(),
        isActive: true,
      }).select('+password +loginAttempts +lockUntil');

      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check if account is locked
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
        throw new AppError(`Account locked. Try again in ${lockTimeRemaining} minutes`, 423);
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        // Increment login attempts
        await user.incrementLoginAttempts();
        throw new AppError('Invalid email or password', 401);
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Generate tokens
  const tokens = generateTokenPair(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${user.email}`, {
        userId: user._id,
        email: user.email,
      });

      // Return user without sensitive data
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.security;

      return {
        user: userResponse,
        tokens,
      };
    } catch (error) {
      logger.error('User login failed', {
        error: error.message,
        email: credentials.email,
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Object} - New tokens
   */
  async refreshTokens(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401);
      }

      const tokens = generateTokens(user._id, user.role);

      logger.info(`Tokens refreshed for user: ${user.email}`, {
        userId: user._id,
      });

      return { tokens };
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
      });
      throw new AppError('Invalid refresh token', 401);
    }
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Object} - User profile
   */
  async getProfile(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.security;

      return userResponse;
    } catch (error) {
      logger.error('Get user profile failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} updateData - Profile update data
   * @returns {Object} - Updated user profile
   */
  async updateProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if email is being updated and is unique
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({ 
          email: updateData.email.toLowerCase(),
          _id: { $ne: userId },
        });
        if (existingUser) {
          throw new AppError('Email already in use', 409);
        }
        updateData.email = updateData.email.toLowerCase();
        updateData.emailVerified = false; // Reset email verification
      }

      // Check if phone is being updated and is unique
      if (updateData.phone && updateData.phone !== user.phone) {
        const existingUser = await User.findOne({ 
          phone: updateData.phone,
          _id: { $ne: userId },
        });
        if (existingUser) {
          throw new AppError('Phone number already in use', 409);
        }
      }

      // Update user
      Object.assign(user, updateData);
      await user.save();

      logger.info(`User profile updated: ${user.email}`, {
        userId: user._id,
        updatedFields: Object.keys(updateData),
      });

      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.security;

      return userResponse;
    } catch (error) {
      logger.error('Update user profile failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Object} - Success message
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      user.password = hashedNewPassword;
      user.passwordChangedAt = new Date();
      await user.save();

      logger.info(`Password changed for user: ${user.email}`, {
        userId: user._id,
      });

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Change password failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Deactivate user account
   * @param {string} userId - User ID
   * @returns {Object} - Success message
   */
  async deactivateAccount(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      user.isActive = false;
      user.deactivatedAt = new Date();
      await user.save();

      logger.info(`User account deactivated: ${user.email}`, {
        userId: user._id,
      });

      return { message: 'Account deactivated successfully' };
    } catch (error) {
      logger.error('Deactivate account failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   * @param {Object} filters - Search filters
   * @param {Object} pagination - Pagination options
   * @returns {Object} - Users list with pagination
   */
  async getAllUsers(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
      const skip = (page - 1) * limit;

      // Build query
      const query = {};
      
      if (filters.search) {
        query.$or = [
          { firstName: { $regex: filters.search, $options: 'i' } },
          { lastName: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      if (filters.role) {
        query.role = filters.role;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.emailVerified !== undefined) {
        query.emailVerified = filters.emailVerified;
      }

      // Get users
      const users = await User.find(query)
        .select('-password -security')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      logger.info('Users list retrieved', {
        count: users.length,
        total,
        page,
        filters,
      });

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get all users failed', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   * @param {string} userId - User ID
   * @param {string} newRole - New role
   * @param {string} adminId - Admin user ID
   * @returns {Object} - Updated user
   */
  async updateUserRole(userId, newRole, adminId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const oldRole = user.role;
      user.role = newRole;
      await user.save();

      logger.info(`User role updated by admin`, {
        userId: user._id,
        adminId,
        oldRole,
        newRole,
        userEmail: user.email,
      });

      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.security;

      return userResponse;
    } catch (error) {
      logger.error('Update user role failed', {
        error: error.message,
        userId,
        newRole,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Delete user (admin only)
   * @param {string} userId - User ID
   * @param {string} adminId - Admin user ID
   * @returns {Object} - Success message
   */
  async deleteUser(userId, adminId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Prevent admin from deleting themselves
      if (userId === adminId) {
        throw new AppError('Cannot delete your own account', 400);
      }

      await User.findByIdAndDelete(userId);

      logger.info(`User deleted by admin`, {
        deletedUserId: userId,
        adminId,
        deletedUserEmail: user.email,
      });

      return { message: 'User deleted successfully' };
    } catch (error) {
      logger.error('Delete user failed', {
        error: error.message,
        userId,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Get user statistics (admin only)
   * @returns {Object} - User statistics
   */
  async getUserStatistics() {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            verifiedUsers: {
              $sum: { $cond: [{ $eq: ['$emailVerified', true] }, 1, 0] }
            },
            adminUsers: {
              $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
            },
            regularUsers: {
              $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalUsers: 1,
            activeUsers: 1,
            verifiedUsers: 1,
            adminUsers: 1,
            regularUsers: 1,
            inactiveUsers: { $subtract: ['$totalUsers', '$activeUsers'] },
            unverifiedUsers: { $subtract: ['$totalUsers', '$verifiedUsers'] },
          },
        },
      ]);

      // Get recent registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRegistrations = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      const statistics = stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        inactiveUsers: 0,
        unverifiedUsers: 0,
      };

      statistics.recentRegistrations = recentRegistrations;

      logger.info('User statistics retrieved', statistics);

      return statistics;
    } catch (error) {
      logger.error('Get user statistics failed', {
        error: error.message,
      });
      throw error;
    }
  }
}

export default new UserService();
