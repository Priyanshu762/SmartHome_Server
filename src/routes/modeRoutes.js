import express from 'express';
import { modeController } from '../controllers/index.js';
import { authenticate } from '../middlewares/auth.js';
import { defaultLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply authentication to all mode routes
router.use(authenticate);
router.use(defaultLimiter);

/**
 * @route   GET /api/v1/modes
 * @desc    Get user modes
 * @access  Private
 */
router.get('/', modeController.getModes);

/**
 * @route   POST /api/v1/modes
 * @desc    Create new mode
 * @access  Private
 */
router.post('/', modeController.createMode);

/**
 * @route   GET /api/v1/modes/active
 * @desc    Get active modes
 * @access  Private
 */
router.get('/active', modeController.getActiveModes);

/**
 * @route   GET /api/v1/modes/statistics
 * @desc    Get mode statistics
 * @access  Private
 */
router.get('/statistics', modeController.getModeStatistics);

/**
 * @route   GET /api/v1/modes/suggestions
 * @desc    Get mode suggestions
 * @access  Private
 */
router.get('/suggestions', modeController.getModeSuggestions);

/**
 * @route   POST /api/v1/modes/suggestions/:suggestionId/create
 * @desc    Create mode from suggestion
 * @access  Private
 */
router.post('/suggestions/:suggestionId/create', modeController.createModeFromSuggestion);

/**
 * @route   POST /api/v1/modes/import
 * @desc    Import mode
 * @access  Private
 */
router.post('/import', modeController.importMode);

/**
 * @route   GET /api/v1/modes/:modeId
 * @desc    Get mode by ID
 * @access  Private
 */
router.get('/:modeId', modeController.getModeById);

/**
 * @route   PUT /api/v1/modes/:modeId
 * @desc    Update mode
 * @access  Private
 */
router.put('/:modeId', modeController.updateMode);

/**
 * @route   DELETE /api/v1/modes/:modeId
 * @desc    Delete mode
 * @access  Private
 */
router.delete('/:modeId', modeController.deleteMode);

/**
 * @route   POST /api/v1/modes/:modeId/activate
 * @desc    Activate mode
 * @access  Private
 */
router.post('/:modeId/activate', modeController.activateMode);

/**
 * @route   POST /api/v1/modes/:modeId/deactivate
 * @desc    Deactivate mode
 * @access  Private
 */
router.post('/:modeId/deactivate', modeController.deactivateMode);

/**
 * @route   POST /api/v1/modes/:modeId/schedule
 * @desc    Schedule mode activation
 * @access  Private
 */
router.post('/:modeId/schedule', modeController.scheduleMode);

/**
 * @route   GET /api/v1/modes/:modeId/schedules
 * @desc    Get mode schedules
 * @access  Private
 */
router.get('/:modeId/schedules', modeController.getModeSchedules);

/**
 * @route   DELETE /api/v1/modes/:modeId/schedules/:scheduleId
 * @desc    Cancel mode schedule
 * @access  Private
 */
router.delete('/:modeId/schedules/:scheduleId', modeController.cancelModeSchedule);

/**
 * @route   GET /api/v1/modes/:modeId/history
 * @desc    Get mode execution history
 * @access  Private
 */
router.get('/:modeId/history', modeController.getModeHistory);

/**
 * @route   POST /api/v1/modes/:modeId/test
 * @desc    Test mode execution
 * @access  Private
 */
router.post('/:modeId/test', modeController.testMode);

/**
 * @route   POST /api/v1/modes/:modeId/duplicate
 * @desc    Duplicate mode
 * @access  Private
 */
router.post('/:modeId/duplicate', modeController.duplicateMode);

/**
 * @route   GET /api/v1/modes/:modeId/export
 * @desc    Export mode
 * @access  Private
 */
router.get('/:modeId/export', modeController.exportMode);

export default router;
