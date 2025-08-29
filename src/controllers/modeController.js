import { modeService, analyticsService } from '../services/index.js';
import { modeValidator } from '../validators/index.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { validateRequest } from '../helpers/helpers.js';

/**
 * Mode Controller
 * Handles automation mode management and operations
 */
class ModeController {
  /**
   * Get user modes
   * @route GET /api/v1/modes
   */
  async getModes(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        type = '',
        category = '',
        isActive = '',
        sortBy = 'name',
        sortOrder = 'asc',
        search = '',
      } = req.query;

      const userId = req.user.id;
      const filters = {
        type,
        category,
        isActive: isActive === '' ? undefined : isActive === 'true',
        search,
      };
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
      };

      const result = await modeService.getUserModes(userId, filters, options);

      logger.debug('User modes retrieved', {
        userId,
        count: result.modes.length,
        total: result.pagination.total,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Get modes failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Get mode by ID
   * @route GET /api/v1/modes/:modeId
   */
  async getModeById(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;

      const mode = await modeService.getModeById(modeId, userId);

      res.json({
        success: true,
        data: { mode },
      });
    } catch (error) {
      logger.error('Get mode by ID failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Create new mode
   * @route POST /api/v1/modes
   */
  async createMode(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(modeValidator.createMode, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const userId = req.user.id;
      const modeData = req.body;

      const mode = await modeService.createMode(modeData, userId);

      // Track mode creation
      await analyticsService.trackEvent(userId, {
        type: 'mode_created',
        category: 'automation',
        action: 'create',
        label: mode._id,
        metadata: {
          modeType: mode.type,
          modeCategory: mode.category,
          actionsCount: mode.actions.length,
        },
      });

      logger.info('Mode created', {
        userId,
        modeId: mode._id,
        name: mode.name,
        type: mode.type,
      });

      res.status(201).json({
        success: true,
        message: 'Mode created successfully',
        data: { mode },
      });
    } catch (error) {
      logger.error('Create mode failed', {
        error: error.message,
        userId: req.user?.id,
        modeName: req.body.name,
      });
      next(error);
    }
  }

  /**
   * Update mode
   * @route PUT /api/v1/modes/:modeId
   */
  async updateMode(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(modeValidator.updateMode, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const updateData = req.body;

      const mode = await modeService.updateMode(modeId, updateData, userId);

      // Track mode update
      await analyticsService.trackEvent(userId, {
        type: 'mode_updated',
        category: 'automation',
        action: 'update',
        label: modeId,
        metadata: {
          updatedFields: Object.keys(updateData),
        },
      });

      logger.info('Mode updated', {
        userId,
        modeId,
        updatedFields: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: 'Mode updated successfully',
        data: { mode },
      });
    } catch (error) {
      logger.error('Update mode failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Delete mode
   * @route DELETE /api/v1/modes/:modeId
   */
  async deleteMode(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;

      await modeService.deleteMode(modeId, userId);

      // Track mode deletion
      await analyticsService.trackEvent(userId, {
        type: 'mode_deleted',
        category: 'automation',
        action: 'delete',
        label: modeId,
      });

      logger.info('Mode deleted', {
        userId,
        modeId,
      });

      res.json({
        success: true,
        message: 'Mode deleted successfully',
      });
    } catch (error) {
      logger.error('Delete mode failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Activate mode
   * @route POST /api/v1/modes/:modeId/activate
   */
  async activateMode(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;
      const { parameters = {} } = req.body;

      const result = await modeService.activateMode(modeId, userId, parameters);

      // Track mode activation
      await analyticsService.trackAutomationExecution(userId, {
        type: 'mode',
        name: result.mode.name,
        id: modeId,
      }, {
        success: result.success,
        duration: result.executionTime,
        triggeredBy: 'manual',
        affectedDevices: result.affectedDevices || [],
      });

      logger.info('Mode activated', {
        userId,
        modeId,
        success: result.success,
        executionTime: result.executionTime,
      });

      res.json({
        success: true,
        message: 'Mode activated successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Activate mode failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Deactivate mode
   * @route POST /api/v1/modes/:modeId/deactivate
   */
  async deactivateMode(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;

      const result = await modeService.deactivateMode(modeId, userId);

      logger.info('Mode deactivated', {
        userId,
        modeId,
        success: result.success,
      });

      res.json({
        success: true,
        message: 'Mode deactivated successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Deactivate mode failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Get active modes
   * @route GET /api/v1/modes/active
   */
  async getActiveModes(req, res, next) {
    try {
      const userId = req.user.id;

      const activeModes = await modeService.getActiveModes(userId);

      res.json({
        success: true,
        data: { modes: activeModes },
      });
    } catch (error) {
      logger.error('Get active modes failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Schedule mode activation
   * @route POST /api/v1/modes/:modeId/schedule
   */
  async scheduleMode(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(modeValidator.scheduleMode, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const scheduleData = req.body;

      const schedule = await modeService.scheduleMode(modeId, scheduleData, userId);

      logger.info('Mode scheduled', {
        userId,
        modeId,
        scheduleId: schedule.id,
        scheduledFor: scheduleData.scheduledFor,
      });

      res.status(201).json({
        success: true,
        message: 'Mode scheduled successfully',
        data: { schedule },
      });
    } catch (error) {
      logger.error('Schedule mode failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Get mode schedules
   * @route GET /api/v1/modes/:modeId/schedules
   */
  async getModeSchedules(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;

      const schedules = await modeService.getModeSchedules(modeId, userId);

      res.json({
        success: true,
        data: { schedules },
      });
    } catch (error) {
      logger.error('Get mode schedules failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Cancel mode schedule
   * @route DELETE /api/v1/modes/:modeId/schedules/:scheduleId
   */
  async cancelModeSchedule(req, res, next) {
    try {
      const { modeId, scheduleId } = req.params;
      const userId = req.user.id;

      await modeService.cancelModeSchedule(modeId, scheduleId, userId);

      logger.info('Mode schedule cancelled', {
        userId,
        modeId,
        scheduleId,
      });

      res.json({
        success: true,
        message: 'Mode schedule cancelled successfully',
      });
    } catch (error) {
      logger.error('Cancel mode schedule failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
        scheduleId: req.params.scheduleId,
      });
      next(error);
    }
  }

  /**
   * Get mode execution history
   * @route GET /api/v1/modes/:modeId/history
   */
  async getModeHistory(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;
      const {
        page = 1,
        limit = 50,
        startDate = '',
        endDate = '',
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      const history = await modeService.getModeHistory(modeId, userId, options);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Get mode history failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Test mode execution
   * @route POST /api/v1/modes/:modeId/test
   */
  async testMode(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;
      const { dryRun = true } = req.body;

      const testResult = await modeService.testMode(modeId, userId, { dryRun });

      logger.info('Mode tested', {
        userId,
        modeId,
        dryRun,
        success: testResult.success,
      });

      res.json({
        success: true,
        message: 'Mode test completed',
        data: testResult,
      });
    } catch (error) {
      logger.error('Test mode failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Get mode statistics
   * @route GET /api/v1/modes/statistics
   */
  async getModeStatistics(req, res, next) {
    try {
      const userId = req.user.id;
      const { timeRange = 30 } = req.query;

      const statistics = await modeService.getModeStatistics(userId, parseInt(timeRange));

      res.json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      logger.error('Get mode statistics failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Duplicate mode
   * @route POST /api/v1/modes/:modeId/duplicate
   */
  async duplicateMode(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;
      const { name } = req.body;

      const newMode = await modeService.duplicateMode(modeId, userId, { name });

      logger.info('Mode duplicated', {
        userId,
        originalModeId: modeId,
        newModeId: newMode._id,
        newName: name,
      });

      res.status(201).json({
        success: true,
        message: 'Mode duplicated successfully',
        data: { mode: newMode },
      });
    } catch (error) {
      logger.error('Duplicate mode failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Get mode suggestions
   * @route GET /api/v1/modes/suggestions
   */
  async getModeSuggestions(req, res, next) {
    try {
      const userId = req.user.id;
      const { category = '', type = '' } = req.query;

      const suggestions = await modeService.getModeSuggestions(userId, {
        category,
        type,
      });

      res.json({
        success: true,
        data: { suggestions },
      });
    } catch (error) {
      logger.error('Get mode suggestions failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Create mode from suggestion
   * @route POST /api/v1/modes/suggestions/:suggestionId/create
   */
  async createModeFromSuggestion(req, res, next) {
    try {
      const { suggestionId } = req.params;
      const userId = req.user.id;
      const { customizations = {} } = req.body;

      const mode = await modeService.createModeFromSuggestion(suggestionId, userId, customizations);

      logger.info('Mode created from suggestion', {
        userId,
        suggestionId,
        modeId: mode._id,
      });

      res.status(201).json({
        success: true,
        message: 'Mode created from suggestion successfully',
        data: { mode },
      });
    } catch (error) {
      logger.error('Create mode from suggestion failed', {
        error: error.message,
        userId: req.user?.id,
        suggestionId: req.params.suggestionId,
      });
      next(error);
    }
  }

  /**
   * Export mode
   * @route GET /api/v1/modes/:modeId/export
   */
  async exportMode(req, res, next) {
    try {
      const { modeId } = req.params;
      const userId = req.user.id;
      const { format = 'json' } = req.query;

      const exportData = await modeService.exportMode(modeId, userId, { format });

      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=mode_${modeId}.json`);

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error) {
      logger.error('Export mode failed', {
        error: error.message,
        userId: req.user?.id,
        modeId: req.params.modeId,
      });
      next(error);
    }
  }

  /**
   * Import mode
   * @route POST /api/v1/modes/import
   */
  async importMode(req, res, next) {
    try {
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(modeValidator.importMode, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { modeData, overwrite = false } = req.body;

      const mode = await modeService.importMode(modeData, userId, { overwrite });

      logger.info('Mode imported', {
        userId,
        modeId: mode._id,
        modeName: mode.name,
        overwrite,
      });

      res.status(201).json({
        success: true,
        message: 'Mode imported successfully',
        data: { mode },
      });
    } catch (error) {
      logger.error('Import mode failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }
}

export default new ModeController();
