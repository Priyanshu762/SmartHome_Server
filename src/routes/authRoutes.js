import express from 'express';
import { authController } from '../controllers/index.js';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to auth routes
router.use(authLimiter);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/google
 * @desc    Google OAuth login
 * @access  Public
 */
router.post('/google', authController.googleLogin);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', authController.resendVerification);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    Change password (authenticated)
 * @access  Private
 */
router.post('/change-password', authenticate, authController.changePassword);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getProfile);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @route   DELETE /api/v1/auth/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', authenticate, authController.deleteAccount);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get user sessions
 * @access  Private
 */
router.get('/sessions', authenticate, authController.getSessions);

/**
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);

export default router;
