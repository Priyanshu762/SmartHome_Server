import { groupService, analyticsService } from '../services/index.js';
import { groupValidator } from '../validators/index.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { validateRequest } from '../helpers/helpers.js';

/**
 * Group Controller
 * Handles device group management and operations
 */
class GroupController {
  /**
   * Get user groups
   * @route GET /api/v1/groups
   */
  async getGroups(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        type = '',
        room = '',
        sortBy = 'name',
        sortOrder = 'asc',
        search = '',
      } = req.query;

      const userId = req.user.id;
      const filters = { type, room, search };
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
      };

      const result = await groupService.getUserGroups(userId, filters, options);

      logger.debug('User groups retrieved', {
        userId,
        count: result.groups.length,
        total: result.pagination.total,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Get groups failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Get group by ID
   * @route GET /api/v1/groups/:groupId
   */
  async getGroupById(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      const group = await groupService.getGroupById(groupId, userId);

      res.json({
        success: true,
        data: { group },
      });
    } catch (error) {
      logger.error('Get group by ID failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Create new group
   * @route POST /api/v1/groups
   */
  async createGroup(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(groupValidator.createGroup, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const userId = req.user.id;
      const groupData = req.body;

      const group = await groupService.createGroup(groupData, userId);

      // Track group creation
      await analyticsService.trackEvent(userId, {
        type: 'group_created',
        category: 'group',
        action: 'create',
        label: group._id,
        metadata: {
          groupType: group.type,
          deviceCount: group.devices.length,
        },
      });

      logger.info('Group created', {
        userId,
        groupId: group._id,
        name: group.name,
        deviceCount: group.devices.length,
      });

      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: { group },
      });
    } catch (error) {
      logger.error('Create group failed', {
        error: error.message,
        userId: req.user?.id,
        groupName: req.body.name,
      });
      next(error);
    }
  }

  /**
   * Update group
   * @route PUT /api/v1/groups/:groupId
   */
  async updateGroup(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(groupValidator.updateGroup, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const updateData = req.body;

      const group = await groupService.updateGroup(groupId, updateData, userId);

      // Track group update
      await analyticsService.trackEvent(userId, {
        type: 'group_updated',
        category: 'group',
        action: 'update',
        label: groupId,
        metadata: {
          updatedFields: Object.keys(updateData),
        },
      });

      logger.info('Group updated', {
        userId,
        groupId,
        updatedFields: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: 'Group updated successfully',
        data: { group },
      });
    } catch (error) {
      logger.error('Update group failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Delete group
   * @route DELETE /api/v1/groups/:groupId
   */
  async deleteGroup(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      await groupService.deleteGroup(groupId, userId);

      // Track group deletion
      await analyticsService.trackEvent(userId, {
        type: 'group_deleted',
        category: 'group',
        action: 'delete',
        label: groupId,
      });

      logger.info('Group deleted', {
        userId,
        groupId,
      });

      res.json({
        success: true,
        message: 'Group deleted successfully',
      });
    } catch (error) {
      logger.error('Delete group failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Add devices to group
   * @route POST /api/v1/groups/:groupId/devices
   */
  async addDevicesToGroup(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(groupValidator.addDevicesToGroup, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { deviceIds } = req.body;

      const group = await groupService.addDevicesToGroup(groupId, deviceIds, userId);

      logger.info('Devices added to group', {
        userId,
        groupId,
        deviceIds,
        addedCount: deviceIds.length,
      });

      res.json({
        success: true,
        message: 'Devices added to group successfully',
        data: { group },
      });
    } catch (error) {
      logger.error('Add devices to group failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Remove devices from group
   * @route DELETE /api/v1/groups/:groupId/devices
   */
  async removeDevicesFromGroup(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(groupValidator.removeDevicesFromGroup, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { deviceIds } = req.body;

      const group = await groupService.removeDevicesFromGroup(groupId, deviceIds, userId);

      logger.info('Devices removed from group', {
        userId,
        groupId,
        deviceIds,
        removedCount: deviceIds.length,
      });

      res.json({
        success: true,
        message: 'Devices removed from group successfully',
        data: { group },
      });
    } catch (error) {
      logger.error('Remove devices from group failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Control group
   * @route POST /api/v1/groups/:groupId/control
   */
  async controlGroup(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(groupValidator.controlGroup, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { action, parameters = {}, sequencing = 'parallel' } = req.body;

      const result = await groupService.controlGroup(groupId, action, parameters, userId, {
        sequencing,
      });

      // Track group control
      await analyticsService.trackEvent(userId, {
        type: 'group_controlled',
        category: 'group',
        action: 'control',
        label: groupId,
        metadata: {
          action,
          sequencing,
          deviceCount: result.results.length,
          successful: result.successful.length,
          failed: result.failed.length,
        },
      });

      logger.info('Group controlled', {
        userId,
        groupId,
        action,
        sequencing,
        successful: result.successful.length,
        failed: result.failed.length,
      });

      res.json({
        success: true,
        message: 'Group control executed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Control group failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
        action: req.body.action,
      });
      next(error);
    }
  }

  /**
   * Get group status
   * @route GET /api/v1/groups/:groupId/status
   */
  async getGroupStatus(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      const status = await groupService.getGroupStatus(groupId, userId);

      res.json({
        success: true,
        data: { status },
      });
    } catch (error) {
      logger.error('Get group status failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Create and activate scene
   * @route POST /api/v1/groups/:groupId/scenes
   */
  async createScene(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(groupValidator.createScene, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const sceneData = req.body;

      const scene = await groupService.createScene(groupId, sceneData, userId);

      logger.info('Scene created', {
        userId,
        groupId,
        sceneId: scene.id,
        sceneName: scene.name,
      });

      res.status(201).json({
        success: true,
        message: 'Scene created successfully',
        data: { scene },
      });
    } catch (error) {
      logger.error('Create scene failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Get group scenes
   * @route GET /api/v1/groups/:groupId/scenes
   */
  async getGroupScenes(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      const scenes = await groupService.getGroupScenes(groupId, userId);

      res.json({
        success: true,
        data: { scenes },
      });
    } catch (error) {
      logger.error('Get group scenes failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Activate scene
   * @route POST /api/v1/groups/:groupId/scenes/:sceneId/activate
   */
  async activateScene(req, res, next) {
    try {
      const { groupId, sceneId } = req.params;
      const userId = req.user.id;

      const result = await groupService.activateScene(groupId, sceneId, userId);

      // Track scene activation
      await analyticsService.trackEvent(userId, {
        type: 'scene_activated',
        category: 'group',
        action: 'activate_scene',
        label: groupId,
        metadata: {
          sceneId,
          deviceCount: result.results.length,
        },
      });

      logger.info('Scene activated', {
        userId,
        groupId,
        sceneId,
        successful: result.successful.length,
        failed: result.failed.length,
      });

      res.json({
        success: true,
        message: 'Scene activated successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Activate scene failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
        sceneId: req.params.sceneId,
      });
      next(error);
    }
  }

  /**
   * Delete scene
   * @route DELETE /api/v1/groups/:groupId/scenes/:sceneId
   */
  async deleteScene(req, res, next) {
    try {
      const { groupId, sceneId } = req.params;
      const userId = req.user.id;

      await groupService.deleteScene(groupId, sceneId, userId);

      logger.info('Scene deleted', {
        userId,
        groupId,
        sceneId,
      });

      res.json({
        success: true,
        message: 'Scene deleted successfully',
      });
    } catch (error) {
      logger.error('Delete scene failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
        sceneId: req.params.sceneId,
      });
      next(error);
    }
  }

  /**
   * Get group statistics
   * @route GET /api/v1/groups/statistics
   */
  async getGroupStatistics(req, res, next) {
    try {
      const userId = req.user.id;
      const { timeRange = 30 } = req.query;

      const statistics = await groupService.getGroupStatistics(userId, parseInt(timeRange));

      res.json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      logger.error('Get group statistics failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Suggest group optimizations
   * @route GET /api/v1/groups/:groupId/optimize
   */
  async getGroupOptimizations(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      const optimizations = await groupService.getGroupOptimizations(groupId, userId);

      res.json({
        success: true,
        data: { optimizations },
      });
    } catch (error) {
      logger.error('Get group optimizations failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Apply group optimization
   * @route POST /api/v1/groups/:groupId/optimize
   */
  async applyGroupOptimization(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(groupValidator.applyOptimization, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { optimizationId } = req.body;

      const result = await groupService.applyGroupOptimization(groupId, optimizationId, userId);

      logger.info('Group optimization applied', {
        userId,
        groupId,
        optimizationId,
        success: result.success,
      });

      res.json({
        success: true,
        message: 'Optimization applied successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Apply group optimization failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }

  /**
   * Get group energy usage
   * @route GET /api/v1/groups/:groupId/energy
   */
  async getGroupEnergyUsage(req, res, next) {
    try {
      const { groupId } = req.params;
      const userId = req.user.id;
      const {
        period = 'day',
        startDate = '',
        endDate = '',
      } = req.query;

      const options = {
        period,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      const energyData = await groupService.getGroupEnergyUsage(groupId, userId, options);

      res.json({
        success: true,
        data: energyData,
      });
    } catch (error) {
      logger.error('Get group energy usage failed', {
        error: error.message,
        userId: req.user?.id,
        groupId: req.params.groupId,
      });
      next(error);
    }
  }
}

export default new GroupController();
