import Mode from '../models/Mode.js';
import Device from '../models/Device.js';
import Group from '../models/Group.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import deviceService from './deviceService.js';
import groupService from './groupService.js';

/**
 * Mode Service
 * Handles mode-related business logic including CRUD operations,
 * mode activation, automation, and scheduling
 */
class ModeService {
  /**
   * Create a new mode
   * @param {Object} modeData - Mode creation data
   * @param {string} userId - User ID who owns the mode
   * @returns {Object} - Created mode
   */
  async createMode(modeData, userId) {
    try {
      // Check if mode name is unique for the user
      const existingMode = await Mode.findOne({
        name: modeData.name,
        owner: userId,
      });

      if (existingMode) {
        throw new AppError('Mode name already exists', 409);
      }

      // Validate device and group references in actions
      await this._validateModeReferences(modeData.actions || [], userId);

      // Create mode
      const mode = new Mode({
        ...modeData,
        owner: userId,
        isActive: false, // Modes start inactive
      });

      await mode.save();

      // Setup auto-activation triggers if enabled
      if (mode.autoActivate?.enabled) {
        await this._setupAutoActivationTriggers(mode);
      }

      logger.info(`Mode created: ${mode.name}`, {
        modeId: mode._id,
        userId,
        type: mode.type,
        actionsCount: mode.actions?.length || 0,
      });

      return mode;
    } catch (error) {
      logger.error('Mode creation failed', {
        error: error.message,
        modeName: modeData.name,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get modes for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Search filters
   * @param {Object} pagination - Pagination options
   * @returns {Object} - Modes list with pagination
   */
  async getUserModes(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = pagination;
      const skip = (page - 1) * limit;

      // Build query
      const query = { owner: userId };

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
        ];
      }

      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.isDefault !== undefined) {
        query.isDefault = filters.isDefault;
      }

      if (filters.priority) {
        query.priority = filters.priority;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      // Get modes
      const modes = await Mode.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      const total = await Mode.countDocuments(query);

      logger.info('User modes retrieved', {
        userId,
        count: modes.length,
        total,
        page,
        filters,
      });

      return {
        modes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get user modes failed', {
        error: error.message,
        userId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get mode by ID
   * @param {string} modeId - Mode ID
   * @param {string} userId - User ID
   * @returns {Object} - Mode details
   */
  async getModeById(modeId, userId) {
    try {
      const mode = await Mode.findOne({
        _id: modeId,
        owner: userId,
      });

      if (!mode) {
        throw new AppError('Mode not found', 404);
      }

      return mode;
    } catch (error) {
      logger.error('Get mode by ID failed', {
        error: error.message,
        modeId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update mode
   * @param {string} modeId - Mode ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Object} - Updated mode
   */
  async updateMode(modeId, updateData, userId) {
    try {
      const mode = await Mode.findOne({
        _id: modeId,
        owner: userId,
      });

      if (!mode) {
        throw new AppError('Mode not found', 404);
      }

      // Check if name is being updated and is unique
      if (updateData.name && updateData.name !== mode.name) {
        const existingMode = await Mode.findOne({
          name: updateData.name,
          owner: userId,
          _id: { $ne: modeId },
        });

        if (existingMode) {
          throw new AppError('Mode name already exists', 409);
        }
      }

      // Validate device and group references if actions are being updated
      if (updateData.actions) {
        await this._validateModeReferences(updateData.actions, userId);
      }

      // Update mode
      Object.assign(mode, updateData);
      mode.updatedAt = new Date();
      await mode.save();

      // Update auto-activation triggers if changed
      if (updateData.autoActivate !== undefined) {
        await this._setupAutoActivationTriggers(mode);
      }

      logger.info(`Mode updated: ${mode.name}`, {
        modeId: mode._id,
        userId,
        updatedFields: Object.keys(updateData),
      });

      return mode;
    } catch (error) {
      logger.error('Update mode failed', {
        error: error.message,
        modeId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete mode
   * @param {string} modeId - Mode ID
   * @param {string} userId - User ID
   * @returns {Object} - Success message
   */
  async deleteMode(modeId, userId) {
    try {
      const mode = await Mode.findOne({
        _id: modeId,
        owner: userId,
      });

      if (!mode) {
        throw new AppError('Mode not found', 404);
      }

      // Deactivate mode if it's currently active
      if (mode.isActive) {
        await this.deactivateMode(modeId, userId);
      }

      await Mode.findByIdAndDelete(modeId);

      logger.info(`Mode deleted: ${mode.name}`, {
        modeId: mode._id,
        userId,
        modeName: mode.name,
      });

      return { message: 'Mode deleted successfully' };
    } catch (error) {
      logger.error('Delete mode failed', {
        error: error.message,
        modeId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Activate mode
   * @param {string} modeId - Mode ID
   * @param {Object} options - Activation options
   * @param {string} userId - User ID
   * @returns {Object} - Activation results
   */
  async activateMode(modeId, options = {}, userId) {
    try {
      const mode = await Mode.findOne({
        _id: modeId,
        owner: userId,
      });

      if (!mode) {
        throw new AppError('Mode not found', 404);
      }

      if (mode.isActive && !options.force) {
        throw new AppError('Mode is already active', 400);
      }

      // Deactivate other active modes if this mode has higher priority or force is true
      if (options.force || mode.priority >= 7) {
        await Mode.updateMany(
          { owner: userId, isActive: true, _id: { $ne: modeId } },
          { 
            isActive: false,
            lastDeactivated: new Date(),
          }
        );
      }

      // Store previous device states if restore on exit is enabled
      if (mode.settings?.restoreOnExit) {
        const previousState = await this._captureDeviceStates(userId);
        mode.settings.previousState = previousState;
      }

      // Execute mode actions
      const executionResults = await this._executeModeActions(mode, options.overrides);

      // Update mode status
      mode.isActive = true;
      mode.lastActivated = new Date();
      mode.activationCount = (mode.activationCount || 0) + 1;

      // Set duration-based deactivation if specified
      if (options.duration) {
        const deactivationTime = new Date();
        deactivationTime.setMinutes(deactivationTime.getMinutes() + 
          (options.duration.unit === 'hours' ? options.duration.value * 60 : options.duration.value));
        
        mode.scheduledDeactivation = deactivationTime;
        
        // Schedule deactivation (you would implement actual scheduling here)
        setTimeout(() => {
          this.deactivateMode(modeId, userId).catch(error => {
            logger.error('Scheduled mode deactivation failed', {
              error: error.message,
              modeId,
              userId,
            });
          });
        }, (deactivationTime.getTime() - Date.now()));
      }

      await mode.save();

      logger.info(`Mode activated: ${mode.name}`, {
        modeId: mode._id,
        userId,
        priority: mode.priority,
        actionsExecuted: executionResults.success.length,
        actionsFailed: executionResults.failed.length,
      });

      return {
        message: 'Mode activated successfully',
        mode: mode,
        executionResults,
      };
    } catch (error) {
      logger.error('Mode activation failed', {
        error: error.message,
        modeId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Deactivate mode
   * @param {string} modeId - Mode ID
   * @param {string} userId - User ID
   * @returns {Object} - Deactivation results
   */
  async deactivateMode(modeId, userId) {
    try {
      const mode = await Mode.findOne({
        _id: modeId,
        owner: userId,
      });

      if (!mode) {
        throw new AppError('Mode not found', 404);
      }

      if (!mode.isActive) {
        throw new AppError('Mode is not active', 400);
      }

      let restorationResults = null;

      // Restore previous device states if enabled
      if (mode.settings?.restoreOnExit && mode.settings?.previousState) {
        restorationResults = await this._restoreDeviceStates(mode.settings.previousState, userId);
      }

      // Update mode status
      mode.isActive = false;
      mode.lastDeactivated = new Date();
      mode.scheduledDeactivation = null;
      if (mode.settings?.previousState) {
        mode.settings.previousState = null;
      }

      await mode.save();

      logger.info(`Mode deactivated: ${mode.name}`, {
        modeId: mode._id,
        userId,
        statesRestored: restorationResults?.success?.length || 0,
      });

      return {
        message: 'Mode deactivated successfully',
        mode: mode,
        restorationResults,
      };
    } catch (error) {
      logger.error('Mode deactivation failed', {
        error: error.message,
        modeId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Toggle mode (activate if inactive, deactivate if active)
   * @param {string} modeId - Mode ID
   * @param {string} userId - User ID
   * @returns {Object} - Toggle results
   */
  async toggleMode(modeId, userId) {
    try {
      const mode = await Mode.findOne({
        _id: modeId,
        owner: userId,
      });

      if (!mode) {
        throw new AppError('Mode not found', 404);
      }

      if (mode.isActive) {
        return await this.deactivateMode(modeId, userId);
      } else {
        return await this.activateMode(modeId, {}, userId);
      }
    } catch (error) {
      logger.error('Mode toggle failed', {
        error: error.message,
        modeId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get active modes for a user
   * @param {string} userId - User ID
   * @returns {Array} - Active modes
   */
  async getActiveModes(userId) {
    try {
      const activeModes = await Mode.find({
        owner: userId,
        isActive: true,
      }).sort({ priority: -1 });

      logger.info('Active modes retrieved', {
        userId,
        count: activeModes.length,
      });

      return activeModes;
    } catch (error) {
      logger.error('Get active modes failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get mode statistics
   * @param {string} userId - User ID
   * @returns {Object} - Mode statistics
   */
  async getModeStatistics(userId) {
    try {
      const stats = await Mode.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: null,
            totalModes: { $sum: 1 },
            activeModes: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            autoActivationEnabled: {
              $sum: { $cond: [{ $eq: ['$autoActivate.enabled', true] }, 1, 0] }
            },
            totalActivations: {
              $sum: { $ifNull: ['$activationCount', 0] }
            },
          },
        },
      ]);

      // Get mode type breakdown
      const typeStats = await Mode.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            averageActivations: {
              $avg: { $ifNull: ['$activationCount', 0] }
            },
            active: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
          },
        },
      ]);

      const statistics = stats[0] || {
        totalModes: 0,
        activeModes: 0,
        autoActivationEnabled: 0,
        totalActivations: 0,
      };

      statistics.modeTypes = typeStats.reduce((acc, type) => {
        acc[type._id] = {
          count: type.count,
          averageActivations: Math.round(type.averageActivations * 100) / 100,
          active: type.active,
        };
        return acc;
      }, {});

      statistics.inactiveModes = statistics.totalModes - statistics.activeModes;

      logger.info('Mode statistics retrieved', {
        userId,
        statistics,
      });

      return statistics;
    } catch (error) {
      logger.error('Get mode statistics failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Private method to validate device and group references in mode actions
   * @param {Array} actions - Mode actions
   * @param {string} userId - User ID
   * @private
   */
  async _validateModeReferences(actions, userId) {
    for (const action of actions) {
      if (action.target) {
        if (action.target.type === 'device' && action.target.ids?.length > 0) {
          const userDevices = await Device.find({
            _id: { $in: action.target.ids },
            owner: userId,
          });

          if (userDevices.length !== action.target.ids.length) {
            throw new AppError('Some devices do not belong to you', 400);
          }
        }

        if (action.target.type === 'group' && action.target.ids?.length > 0) {
          const userGroups = await Group.find({
            _id: { $in: action.target.ids },
            owner: userId,
          });

          if (userGroups.length !== action.target.ids.length) {
            throw new AppError('Some groups do not belong to you', 400);
          }
        }
      }
    }
  }

  /**
   * Private method to execute mode actions
   * @param {Object} mode - Mode object
   * @param {Object} overrides - Action overrides
   * @private
   */
  async _executeModeActions(mode, overrides = {}) {
    const results = {
      success: [],
      failed: [],
    };

    // Sort actions by order
    const sortedActions = [...(mode.actions || [])].sort((a, b) => (a.order || 1) - (b.order || 1));

    for (const action of sortedActions) {
      if (!action.isEnabled) continue;

      try {
        switch (action.type) {
          case 'device_control':
            await this._executeDeviceControl(action, mode.owner);
            break;
          case 'group_control':
            await this._executeGroupControl(action, mode.owner);
            break;
          case 'mode_activation':
            await this._executeModeActivation(action, mode.owner);
            break;
          case 'notification':
            await this._executeNotification(action, mode.owner);
            break;
          case 'webhook':
            await this._executeWebhook(action);
            break;
          case 'delay':
            await this._executeDelay(action);
            break;
          case 'scene_activation':
            await this._executeSceneActivation(action, mode.owner);
            break;
          default:
            throw new Error(`Unknown action type: ${action.type}`);
        }

        results.success.push({
          actionId: action.id,
          type: action.type,
        });
      } catch (error) {
        results.failed.push({
          actionId: action.id,
          type: action.type,
          error: error.message,
        });

        if (!action.continueOnError) {
          break; // Stop execution if action fails and continueOnError is false
        }
      }
    }

    return results;
  }

  /**
   * Private method to execute device control action
   * @param {Object} action - Device control action
   * @param {string} userId - User ID
   * @private
   */
  async _executeDeviceControl(action, userId) {
    const { device: { deviceId, action: deviceAction, settings } } = action;
    await deviceService.controlDevice(deviceId, deviceAction, settings, userId);
  }

  /**
   * Private method to execute group control action
   * @param {Object} action - Group control action
   * @param {string} userId - User ID
   * @private
   */
  async _executeGroupControl(action, userId) {
    const { group: { groupId, action: groupAction, target, deviceIds, randomCount, settings } } = action;
    const controlData = {
      action: groupAction,
      target,
      deviceIds,
      randomCount,
      settings,
    };
    await groupService.controlGroup(groupId, controlData, userId);
  }

  /**
   * Private method to execute mode activation action
   * @param {Object} action - Mode activation action
   * @param {string} userId - User ID
   * @private
   */
  async _executeModeActivation(action, userId) {
    const { mode: { modeId, action: modeAction, duration } } = action;
    
    switch (modeAction) {
      case 'activate':
        await this.activateMode(modeId, { duration }, userId);
        break;
      case 'deactivate':
        await this.deactivateMode(modeId, userId);
        break;
      case 'toggle':
        await this.toggleMode(modeId, userId);
        break;
    }
  }

  /**
   * Private method to execute notification action
   * @param {Object} action - Notification action
   * @param {string} userId - User ID
   * @private
   */
  async _executeNotification(action, userId) {
    const { notification } = action;
    
    // Here you would implement actual notification sending
    logger.info('Notification sent from mode action', {
      userId,
      title: notification.title,
      message: notification.message,
      channels: notification.channels,
    });
  }

  /**
   * Private method to execute webhook action
   * @param {Object} action - Webhook action
   * @private
   */
  async _executeWebhook(action) {
    const { webhook } = action;
    
    // Here you would implement actual webhook calling
    logger.info('Webhook called from mode action', {
      url: webhook.url,
      method: webhook.method,
    });
  }

  /**
   * Private method to execute delay action
   * @param {Object} action - Delay action
   * @private
   */
  async _executeDelay(action) {
    const { delay: { duration, unit } } = action;
    const delayMs = unit === 'hours' ? duration * 3600000 : 
                   unit === 'minutes' ? duration * 60000 : 
                   duration * 1000;
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Private method to execute scene activation action
   * @param {Object} action - Scene activation action
   * @param {string} userId - User ID
   * @private
   */
  async _executeSceneActivation(action, userId) {
    const { sceneId } = action;
    
    // Here you would implement scene activation
    logger.info('Scene activated from mode action', {
      userId,
      sceneId,
    });
  }

  /**
   * Private method to capture current device states
   * @param {string} userId - User ID
   * @private
   */
  async _captureDeviceStates(userId) {
    const devices = await Device.find({ owner: userId });
    
    return devices.map(device => ({
      deviceId: device._id,
      powerState: device.powerState,
      settings: { ...device.settings },
    }));
  }

  /**
   * Private method to restore device states
   * @param {Array} previousStates - Previous device states
   * @param {string} userId - User ID
   * @private
   */
  async _restoreDeviceStates(previousStates, userId) {
    const results = {
      success: [],
      failed: [],
    };

    for (const state of previousStates) {
      try {
        const action = state.powerState === 'on' ? 'turn_on' : 'turn_off';
        await deviceService.controlDevice(state.deviceId, action, {}, userId);
        
        if (state.settings) {
          await deviceService.updateDeviceSettings(state.deviceId, state.settings, userId);
        }

        results.success.push({
          deviceId: state.deviceId,
        });
      } catch (error) {
        results.failed.push({
          deviceId: state.deviceId,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Private method to setup auto-activation triggers
   * @param {Object} mode - Mode object
   * @private
   */
  async _setupAutoActivationTriggers(mode) {
    // Here you would implement actual trigger setup
    // For example, setting up cron jobs, event listeners, etc.
    
    logger.info('Auto-activation triggers setup for mode', {
      modeId: mode._id,
      triggersCount: mode.autoActivate?.triggers?.length || 0,
    });
  }
}

export default new ModeService();
