import { userService } from '../services/index.js';
import { userValidator } from '../validators/index.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { validateRequest } from '../helpers/helpers.js';

/**
 * User Controller
 * Handles user management operations (admin functions)
 */
class UserController {
  /**
   * Get all users (admin only)
   * @route GET /api/v1/users
   */
  async getUsers(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
        role = '',
        isActive = '',
        isEmailVerified = '',
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
        search,
        role,
        isActive: isActive === '' ? undefined : isActive === 'true',
        isEmailVerified: isEmailVerified === '' ? undefined : isEmailVerified === 'true',
      };

      const result = await userService.getUsers(options);

      logger.info('Users retrieved', {
        adminId: req.user.id,
        count: result.users.length,
        total: result.pagination.total,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Get users failed', {
        error: error.message,
        adminId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Get user by ID (admin only)
   * @route GET /api/v1/users/:userId
   */
  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await userService.getUserById(userId);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      logger.info('User retrieved by admin', {
        adminId: req.user.id,
        userId,
      });

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      logger.error('Get user by ID failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }

  /**
   * Create user (admin only)
   * @route POST /api/v1/users
   */
  async createUser(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(userValidator.createUser, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const userData = req.body;

      const result = await userService.createUser(userData);

      logger.info('User created by admin', {
        adminId: req.user.id,
        newUserId: result.user._id,
        email: result.user.email,
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user: result.user },
      });
    } catch (error) {
      logger.error('Create user failed', {
        error: error.message,
        adminId: req.user?.id,
        email: req.body.email,
      });
      next(error);
    }
  }

  /**
   * Update user (admin only)
   * @route PUT /api/v1/users/:userId
   */
  async updateUser(req, res, next) {
    try {
      const { userId } = req.params;

      // Validate request
      const validationError = validateRequest(userValidator.updateUser, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const updateData = req.body;

      const user = await userService.updateUser(userId, updateData);

      logger.info('User updated by admin', {
        adminId: req.user.id,
        userId,
        updatedFields: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Update user failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }

  /**
   * Delete user (admin only)
   * @route DELETE /api/v1/users/:userId
   */
  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;

      await userService.deleteUser(userId);

      logger.info('User deleted by admin', {
        adminId: req.user.id,
        deletedUserId: userId,
      });

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Delete user failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }

  /**
   * Activate/Deactivate user (admin only)
   * @route PATCH /api/v1/users/:userId/status
   */
  async updateUserStatus(req, res, next) {
    try {
      const { userId } = req.params;

      // Validate request
      const validationError = validateRequest(userValidator.updateUserStatus, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { isActive } = req.body;

      const user = await userService.updateUserStatus(userId, isActive);

      logger.info('User status updated by admin', {
        adminId: req.user.id,
        userId,
        newStatus: isActive ? 'active' : 'inactive',
      });

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: { user },
      });
    } catch (error) {
      logger.error('Update user status failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }

  /**
   * Update user role (admin only)
   * @route PATCH /api/v1/users/:userId/role
   */
  async updateUserRole(req, res, next) {
    try {
      const { userId } = req.params;

      // Validate request
      const validationError = validateRequest(userValidator.updateUserRole, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { role } = req.body;

      const user = await userService.updateUserRole(userId, role);

      logger.info('User role updated by admin', {
        adminId: req.user.id,
        userId,
        newRole: role,
      });

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Update user role failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }

  /**
   * Get user statistics (admin only)
   * @route GET /api/v1/users/statistics
   */
  async getUserStatistics(req, res, next) {
    try {
      const { timeRange = 30 } = req.query;

      const statistics = await userService.getUserStatistics(parseInt(timeRange));

      logger.info('User statistics retrieved', {
        adminId: req.user.id,
        timeRange,
      });

      res.json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      logger.error('Get user statistics failed', {
        error: error.message,
        adminId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Get user activity (admin only)
   * @route GET /api/v1/users/:userId/activity
   */
  async getUserActivity(req, res, next) {
    try {
      const { userId } = req.params;
      const {
        page = 1,
        limit = 20,
        type = '',
        startDate = '',
        endDate = '',
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      const activity = await userService.getUserActivity(userId, options);

      logger.info('User activity retrieved', {
        adminId: req.user.id,
        userId,
        activityCount: activity.activities.length,
      });

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      logger.error('Get user activity failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }

  /**
   * Reset user password (admin only)
   * @route POST /api/v1/users/:userId/reset-password
   */
  async resetUserPassword(req, res, next) {
    try {
      const { userId } = req.params;

      // Validate request
      const validationError = validateRequest(userValidator.resetUserPassword, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { newPassword, sendEmail = true } = req.body;

      await userService.resetUserPassword(userId, newPassword, sendEmail);

      logger.info('User password reset by admin', {
        adminId: req.user.id,
        userId,
        sendEmail,
      });

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Reset user password failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }

  /**
   * Force verify user email (admin only)
   * @route POST /api/v1/users/:userId/verify-email
   */
  async verifyUserEmail(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await userService.forceVerifyEmail(userId);

      logger.info('User email verified by admin', {
        adminId: req.user.id,
        userId,
      });

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: { user },
      });
    } catch (error) {
      logger.error('Verify user email failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }

  /**
   * Get user devices (admin only)
   * @route GET /api/v1/users/:userId/devices
   */
  async getUserDevices(req, res, next) {
    try {
      const { userId } = req.params;
      const {
        page = 1,
        limit = 20,
        type = '',
        status = '',
        sortBy = 'name',
        sortOrder = 'asc',
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        status,
        sortBy,
        sortOrder,
      };

      const result = await userService.getUserDevices(userId, options);

      logger.info('User devices retrieved by admin', {
        adminId: req.user.id,
        userId,
        deviceCount: result.devices.length,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Get user devices failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }

  /**
   * Export users (admin only)
   * @route GET /api/v1/users/export
   */
  async exportUsers(req, res, next) {
    try {
      const {
        format = 'csv',
        fields = 'id,email,firstName,lastName,role,createdAt',
        filters = {},
      } = req.query;

      const exportData = await userService.exportUsers({
        format,
        fields: fields.split(','),
        filters: filters ? JSON.parse(filters) : {},
      });

      logger.info('Users exported', {
        adminId: req.user.id,
        format,
        recordCount: exportData.data.length,
      });

      // Set appropriate headers for file download
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=users.json');
      }

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      logger.error('Export users failed', {
        error: error.message,
        adminId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Bulk update users (admin only)
   * @route PATCH /api/v1/users/bulk-update
   */
  async bulkUpdateUsers(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(userValidator.bulkUpdateUsers, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { userIds, updateData } = req.body;

      const result = await userService.bulkUpdateUsers(userIds, updateData);

      logger.info('Bulk user update completed', {
        adminId: req.user.id,
        userCount: userIds.length,
        successful: result.successful.length,
        failed: result.failed.length,
      });

      res.json({
        success: true,
        message: 'Bulk update completed',
        data: result,
      });
    } catch (error) {
      logger.error('Bulk update users failed', {
        error: error.message,
        adminId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Send notification to user (admin only)
   * @route POST /api/v1/users/:userId/notify
   */
  async notifyUser(req, res, next) {
    try {
      const { userId } = req.params;

      // Validate request
      const validationError = validateRequest(userValidator.notifyUser, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { title, message, type = 'info', channels = ['in-app'] } = req.body;

      const result = await userService.sendNotificationToUser(userId, {
        title,
        message,
        type,
        channels,
        data: {
          source: 'admin',
          adminId: req.user.id,
        },
      });

      logger.info('Notification sent to user by admin', {
        adminId: req.user.id,
        userId,
        type,
        channels,
      });

      res.json({
        success: true,
        message: 'Notification sent successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Send notification to user failed', {
        error: error.message,
        adminId: req.user?.id,
        userId: req.params.userId,
      });
      next(error);
    }
  }
}

export default new UserController();
