import { userService } from '../services/index.js';
import { userValidator } from '../validators/index.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { validateRequest } from '../helpers/helpers.js';

/**
 * Authentication Controller
 * Handles user authentication, registration, and session management
 */
class AuthController {
  /**
   * Register a new user
   * @route POST /api/v1/auth/register
   */
  async register(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(userValidator.validateUserRegistration, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { name, email, password, confirmPassword } = req.body;

      // Register user
      const result = await userService.register({
        email,
        password,
        name,
      });

      logger.info('User registered successfully', {
        userId: result.user._id,
        email: result.user.email,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: result.user._id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            isEmailVerified: result.user.isEmailVerified,
            createdAt: result.user.createdAt,
          },
          tokens: result.tokens,
        },
      });
    } catch (error) {
      logger.error('User registration failed', {
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Login user
   * @route POST /api/v1/auth/login
   */
  async login(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(userValidator.validateUserLogin, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { email, password } = req.body;

      // Login user
      const result = await userService.login({ email, password });

      logger.info('User logged in successfully', {
        userId: result.user._id,
        email: result.user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user._id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            isEmailVerified: result.user.isEmailVerified,
            lastLoginAt: result.user.lastLoginAt,
          },
          tokens: result.tokens,
        },
      });
    } catch (error) {
      logger.error('User login failed', {
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Google OAuth login
   * @route POST /api/v1/auth/google
   */
  async googleLogin(req, res, next) {
    try {
      // Validate request (Google Auth validator not available yet)
      // const validationError = validateRequest(userValidator.validateGoogleAuth, req.body);
      // if (validationError) {
      //   throw new AppError(validationError.message, 400);
      // }

      const { token } = req.body;

      // Login with Google
      const result = await userService.googleLogin(token);

      logger.info('Google login successful', {
        userId: result.user._id,
        email: result.user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Google login successful',
        data: {
          user: {
            id: result.user._id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
            isEmailVerified: result.user.isEmailVerified,
            lastLoginAt: result.user.lastLoginAt,
          },
          tokens: result.tokens,
          isNewUser: result.isNewUser,
        },
      });
    } catch (error) {
      logger.error('Google login failed', {
        error: error.message,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Refresh access token
   * @route POST /api/v1/auth/refresh
   */
  async refreshToken(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(userValidator.validateRefreshToken, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { refreshToken } = req.body;

      // Refresh token
      const tokens = await userService.refreshTokens(refreshToken);

      logger.debug('Token refreshed successfully', {
        ip: req.ip,
      });

      res.json({
        success: true,
        data: { tokens },
      });
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Logout user
   * @route POST /api/v1/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user.id;

      // Logout user
      await userService.logoutUser(userId, refreshToken);

      logger.info('User logged out successfully', {
        userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('User logout failed', {
        error: error.message,
        userId: req.user?.id,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Logout from all devices
   * @route POST /api/v1/auth/logout-all
   */
  async logoutAll(req, res, next) {
    try {
      const userId = req.user.id;

      // Logout from all devices
      await userService.logoutAllDevices(userId);

      logger.info('User logged out from all devices', {
        userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      logger.error('Logout all devices failed', {
        error: error.message,
        userId: req.user?.id,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Verify email
   * @route POST /api/v1/auth/verify-email
   */
  async verifyEmail(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(userValidator.validateEmailVerification, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { token } = req.body;

      // Verify email
      const user = await userService.verifyEmail(token);

      logger.info('Email verified successfully', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            isEmailVerified: user.isEmailVerified,
          },
        },
      });
    } catch (error) {
      logger.error('Email verification failed', {
        error: error.message,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Resend verification email
   * @route POST /api/v1/auth/resend-verification
   */
  async resendVerification(req, res, next) {
    try {
      // Validate request
      // TODO: Add resend verification validator if available

      const { email } = req.body;

      // Resend verification email
      await userService.resendVerificationEmail(email);

      logger.info('Verification email resent', {
        email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error) {
      logger.error('Resend verification email failed', {
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Request password reset
   * @route POST /api/v1/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(userValidator.validatePasswordResetRequest, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { email } = req.body;

      // Request password reset
      await userService.requestPasswordReset(email);

      logger.info('Password reset requested', {
        email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Password reset email sent successfully',
      });
    } catch (error) {
      logger.error('Password reset request failed', {
        error: error.message,
        email: req.body.email,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Reset password
   * @route POST /api/v1/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(userValidator.validatePasswordReset, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { token, password } = req.body;

      // Reset password
      const user = await userService.resetPassword(token, password);

      logger.info('Password reset successfully', {
        userId: user._id,
        email: user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Password reset failed', {
        error: error.message,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Change password (authenticated)
   * @route POST /api/v1/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(userValidator.validatePasswordChange, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Change password
      await userService.changePassword(userId, currentPassword, newPassword);

      logger.info('Password changed successfully', {
        userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Password change failed', {
        error: error.message,
        userId: req.user?.id,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Get current user profile
   * @route GET /api/v1/auth/me
   */
  async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      // Get user profile
      const user = await userService.getProfile(userId);

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            preferences: user.preferences,
            notificationPreferences: user.notificationPreferences,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Get profile failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Update user profile
   * @route PUT /api/v1/auth/profile
   */
  async updateProfile(req, res, next) {
    try {
      // Validate request
      // TODO: Add update profile validator if available

      const userId = req.user.id;
      const updateData = req.body;

      // Update profile
      const user = await userService.updateProfile(userId, updateData);

      logger.info('Profile updated successfully', {
        userId,
        updatedFields: Object.keys(updateData),
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            preferences: user.preferences,
            notificationPreferences: user.notificationPreferences,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Profile update failed', {
        error: error.message,
        userId: req.user?.id,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Delete user account
   * @route DELETE /api/v1/auth/account
   */
  async deleteAccount(req, res, next) {
    try {
      // Validate request
      // TODO: Add delete account validator if available

      const { password } = req.body;
      const userId = req.user.id;

      // Delete account
      await userService.deleteUserAccount(userId, password);

      logger.info('User account deleted', {
        userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      logger.error('Account deletion failed', {
        error: error.message,
        userId: req.user?.id,
        ip: req.ip,
      });
      next(error);
    }
  }

  /**
   * Get user sessions
   * @route GET /api/v1/auth/sessions
   */
  async getSessions(req, res, next) {
    try {
      const userId = req.user.id;

      // Get user sessions
      const sessions = await userService.getUserSessions(userId);

      res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      logger.error('Get sessions failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Revoke session
   * @route DELETE /api/v1/auth/sessions/:sessionId
   */
  async revokeSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      // Revoke session
      await userService.revokeSession(userId, sessionId);

      logger.info('Session revoked', {
        userId,
        sessionId,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      logger.error('Session revocation failed', {
        error: error.message,
        userId: req.user?.id,
        sessionId: req.params.sessionId,
      });
      next(error);
    }
  }
}

export default new AuthController();
