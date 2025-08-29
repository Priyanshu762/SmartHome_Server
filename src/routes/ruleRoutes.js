import express from 'express';
import { ruleController } from '../controllers/index.js';
import { authenticate } from '../middlewares/auth.js';
import { defaultLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply authentication to all rule routes
router.use(authenticate);
router.use(defaultLimiter);

/**
 * @route   GET /api/v1/rules
 * @desc    Get user rules
 * @access  Private
 */
router.get('/', ruleController.getRules);

/**
 * @route   POST /api/v1/rules
 * @desc    Create new rule
 * @access  Private
 */
router.post('/', ruleController.createRule);

/**
 * @route   GET /api/v1/rules/statistics
 * @desc    Get rule statistics
 * @access  Private
 */
router.get('/statistics', ruleController.getRuleStatistics);

/**
 * @route   GET /api/v1/rules/suggestions
 * @desc    Get rule suggestions
 * @access  Private
 */
router.get('/suggestions', ruleController.getRuleSuggestions);

/**
 * @route   POST /api/v1/rules/suggestions/:suggestionId/create
 * @desc    Create rule from suggestion
 * @access  Private
 */
router.post('/suggestions/:suggestionId/create', ruleController.createRuleFromSuggestion);

/**
 * @route   POST /api/v1/rules/import
 * @desc    Import rule
 * @access  Private
 */
router.post('/import', ruleController.importRule);

/**
 * @route   POST /api/v1/rules/bulk
 * @desc    Bulk operations on rules
 * @access  Private
 */
router.post('/bulk', ruleController.bulkRuleOperations);

/**
 * @route   GET /api/v1/rules/:ruleId
 * @desc    Get rule by ID
 * @access  Private
 */
router.get('/:ruleId', ruleController.getRuleById);

/**
 * @route   PUT /api/v1/rules/:ruleId
 * @desc    Update rule
 * @access  Private
 */
router.put('/:ruleId', ruleController.updateRule);

/**
 * @route   DELETE /api/v1/rules/:ruleId
 * @desc    Delete rule
 * @access  Private
 */
router.delete('/:ruleId', ruleController.deleteRule);

/**
 * @route   PATCH /api/v1/rules/:ruleId/toggle
 * @desc    Toggle rule active status
 * @access  Private
 */
router.patch('/:ruleId/toggle', ruleController.toggleRule);

/**
 * @route   POST /api/v1/rules/:ruleId/test
 * @desc    Test rule execution
 * @access  Private
 */
router.post('/:ruleId/test', ruleController.testRule);

/**
 * @route   GET /api/v1/rules/:ruleId/history
 * @desc    Get rule execution history
 * @access  Private
 */
router.get('/:ruleId/history', ruleController.getRuleHistory);

/**
 * @route   POST /api/v1/rules/:ruleId/trigger
 * @desc    Manually trigger rule
 * @access  Private
 */
router.post('/:ruleId/trigger', ruleController.triggerRule);

/**
 * @route   POST /api/v1/rules/:ruleId/duplicate
 * @desc    Duplicate rule
 * @access  Private
 */
router.post('/:ruleId/duplicate', ruleController.duplicateRule);

/**
 * @route   GET /api/v1/rules/:ruleId/conflicts
 * @desc    Get rule conflicts
 * @access  Private
 */
router.get('/:ruleId/conflicts', ruleController.getRuleConflicts);

/**
 * @route   POST /api/v1/rules/:ruleId/resolve-conflicts
 * @desc    Resolve rule conflicts
 * @access  Private
 */
router.post('/:ruleId/resolve-conflicts', ruleController.resolveRuleConflicts);

/**
 * @route   GET /api/v1/rules/:ruleId/export
 * @desc    Export rule
 * @access  Private
 */
router.get('/:ruleId/export', ruleController.exportRule);

export default router;
