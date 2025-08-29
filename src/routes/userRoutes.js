import express from 'express';
import { userController } from '../controllers/index.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { defaultLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply authentication and admin authorization to all user management routes
router.use(authenticate);
router.use(authorize('admin'));
router.use(defaultLimiter);

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get('/', userController.getUsers);

/**
 * @route   POST /api/v1/users
 * @desc    Create user (admin only)
 * @access  Private/Admin
 */
router.post('/', userController.createUser);

/**
 * @route   GET /api/v1/users/statistics
 * @desc    Get user statistics (admin only)
 * @access  Private/Admin
 */
router.get('/statistics', userController.getUserStatistics);

/**
 * @route   GET /api/v1/users/export
 * @desc    Export users (admin only)
 * @access  Private/Admin
 */
router.get('/export', userController.exportUsers);

/**
 * @route   PATCH /api/v1/users/bulk-update
 * @desc    Bulk update users (admin only)
 * @access  Private/Admin
 */
router.patch('/bulk-update', userController.bulkUpdateUsers);

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID (admin only)
 * @access  Private/Admin
 */
router.get('/:userId', userController.getUserById);

/**
 * @route   PUT /api/v1/users/:userId
 * @desc    Update user (admin only)
 * @access  Private/Admin
 */
router.put('/:userId', userController.updateUser);

/**
 * @route   DELETE /api/v1/users/:userId
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete('/:userId', userController.deleteUser);

/**
 * @route   PATCH /api/v1/users/:userId/status
 * @desc    Update user status (admin only)
 * @access  Private/Admin
 */
router.patch('/:userId/status', userController.updateUserStatus);

/**
 * @route   PATCH /api/v1/users/:userId/role
 * @desc    Update user role (admin only)
 * @access  Private/Admin
 */
router.patch('/:userId/role', userController.updateUserRole);

/**
 * @route   GET /api/v1/users/:userId/activity
 * @desc    Get user activity (admin only)
 * @access  Private/Admin
 */
router.get('/:userId/activity', userController.getUserActivity);

/**
 * @route   POST /api/v1/users/:userId/reset-password
 * @desc    Reset user password (admin only)
 * @access  Private/Admin
 */
router.post('/:userId/reset-password', userController.resetUserPassword);

/**
 * @route   POST /api/v1/users/:userId/verify-email
 * @desc    Force verify user email (admin only)
 * @access  Private/Admin
 */
router.post('/:userId/verify-email', userController.verifyUserEmail);

/**
 * @route   GET /api/v1/users/:userId/devices
 * @desc    Get user devices (admin only)
 * @access  Private/Admin
 */
router.get('/:userId/devices', userController.getUserDevices);

/**
 * @route   POST /api/v1/users/:userId/notify
 * @desc    Send notification to user (admin only)
 * @access  Private/Admin
 */
router.post('/:userId/notify', userController.notifyUser);

export default router;
