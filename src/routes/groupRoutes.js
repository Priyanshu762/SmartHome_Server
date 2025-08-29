import express from 'express';
import { groupController } from '../controllers/index.js';
import { authenticate } from '../middlewares/auth.js';
import { defaultLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply authentication to all group routes
router.use(authenticate);
router.use(defaultLimiter);

/**
 * @route   GET /api/v1/groups
 * @desc    Get user groups
 * @access  Private
 */
router.get('/', groupController.getGroups);

/**
 * @route   POST /api/v1/groups
 * @desc    Create new group
 * @access  Private
 */
router.post('/', groupController.createGroup);

/**
 * @route   GET /api/v1/groups/statistics
 * @desc    Get group statistics
 * @access  Private
 */
router.get('/statistics', groupController.getGroupStatistics);

/**
 * @route   GET /api/v1/groups/:groupId
 * @desc    Get group by ID
 * @access  Private
 */
router.get('/:groupId', groupController.getGroupById);

/**
 * @route   PUT /api/v1/groups/:groupId
 * @desc    Update group
 * @access  Private
 */
router.put('/:groupId', groupController.updateGroup);

/**
 * @route   DELETE /api/v1/groups/:groupId
 * @desc    Delete group
 * @access  Private
 */
router.delete('/:groupId', groupController.deleteGroup);

/**
 * @route   POST /api/v1/groups/:groupId/devices
 * @desc    Add devices to group
 * @access  Private
 */
router.post('/:groupId/devices', groupController.addDevicesToGroup);

/**
 * @route   DELETE /api/v1/groups/:groupId/devices
 * @desc    Remove devices from group
 * @access  Private
 */
router.delete('/:groupId/devices', groupController.removeDevicesFromGroup);

/**
 * @route   POST /api/v1/groups/:groupId/control
 * @desc    Control group
 * @access  Private
 */
router.post('/:groupId/control', groupController.controlGroup);

/**
 * @route   GET /api/v1/groups/:groupId/status
 * @desc    Get group status
 * @access  Private
 */
router.get('/:groupId/status', groupController.getGroupStatus);

/**
 * @route   POST /api/v1/groups/:groupId/scenes
 * @desc    Create scene for group
 * @access  Private
 */
router.post('/:groupId/scenes', groupController.createScene);

/**
 * @route   GET /api/v1/groups/:groupId/scenes
 * @desc    Get group scenes
 * @access  Private
 */
router.get('/:groupId/scenes', groupController.getGroupScenes);

/**
 * @route   POST /api/v1/groups/:groupId/scenes/:sceneId/activate
 * @desc    Activate scene
 * @access  Private
 */
router.post('/:groupId/scenes/:sceneId/activate', groupController.activateScene);

/**
 * @route   DELETE /api/v1/groups/:groupId/scenes/:sceneId
 * @desc    Delete scene
 * @access  Private
 */
router.delete('/:groupId/scenes/:sceneId', groupController.deleteScene);

/**
 * @route   GET /api/v1/groups/:groupId/optimize
 * @desc    Get group optimizations
 * @access  Private
 */
router.get('/:groupId/optimize', groupController.getGroupOptimizations);

/**
 * @route   POST /api/v1/groups/:groupId/optimize
 * @desc    Apply group optimization
 * @access  Private
 */
router.post('/:groupId/optimize', groupController.applyGroupOptimization);

/**
 * @route   GET /api/v1/groups/:groupId/energy
 * @desc    Get group energy usage
 * @access  Private
 */
router.get('/:groupId/energy', groupController.getGroupEnergyUsage);

export default router;
