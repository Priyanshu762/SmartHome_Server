import Device from '../models/Device.js';
import User from '../models/User.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { DEVICE_TYPES, DEVICE_STATUS, POWER_STATES } from '../config/constants.js';

/**
 * Device Service
 * Handles device-related business logic including CRUD operations,
 * device control, monitoring, and automation
 */
class DeviceService {
  /**
   * Create a new device
   * @param {Object} deviceData - Device creation data
   * @param {string} userId - User ID who owns the device
   * @returns {Object} - Created device
   */
  async createDevice(deviceData, userId) {
    try {
      // Check if device name is unique for the user
      const existingDevice = await Device.findOne({
        name: deviceData.name,
        owner: userId,
      });

      if (existingDevice) {
        throw new AppError('Device name already exists', 409);
      }

      // Check if IP address is unique (if provided)
      if (deviceData.ipAddress) {
        const deviceWithSameIP = await Device.findOne({
          ipAddress: deviceData.ipAddress,
          owner: userId,
        });

        if (deviceWithSameIP) {
          throw new AppError('Device with this IP address already exists', 409);
        }
      }

      // Create device
      const device = new Device({
        ...deviceData,
        owner: userId,
        status: DEVICE_STATUS.OFFLINE,
        powerState: POWER_STATES.OFF,
        isOnline: false,
        lastSeen: new Date(),
      });

      await device.save();

      logger.info(`Device created: ${device.name}`, {
        deviceId: device._id,
        userId,
        deviceType: device.type,
        deviceName: device.name,
      });

      return device;
    } catch (error) {
      logger.error('Device creation failed', {
        error: error.message,
        deviceName: deviceData.name,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get devices for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Search filters
   * @param {Object} pagination - Pagination options
   * @returns {Object} - Devices list with pagination
   */
  async getUserDevices(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = pagination;
      const skip = (page - 1) * limit;

      // Build query
      const query = { owner: userId };

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { description: { $regex: filters.search, $options: 'i' } },
          { manufacturer: { $regex: filters.search, $options: 'i' } },
          { model: { $regex: filters.search, $options: 'i' } },
        ];
      }

      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.powerState) {
        query.powerState = filters.powerState;
      }

      if (filters.isOnline !== undefined) {
        query.isOnline = filters.isOnline;
      }

      if (filters.room) {
        query['location.room'] = { $regex: filters.room, $options: 'i' };
      }

      if (filters.group) {
        query.groups = filters.group;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.hasCapability) {
        query[`capabilities.${filters.hasCapability}`] = true;
      }

      // Get devices
      const devices = await Device.find(query)
        .populate('groups', 'name type')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      const total = await Device.countDocuments(query);

      logger.info('User devices retrieved', {
        userId,
        count: devices.length,
        total,
        page,
        filters,
      });

      return {
        devices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get user devices failed', {
        error: error.message,
        userId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get device by ID
   * @param {string} deviceId - Device ID
   * @param {string} userId - User ID
   * @returns {Object} - Device details
   */
  async getDeviceById(deviceId, userId) {
    try {
      const device = await Device.findOne({
        _id: deviceId,
        owner: userId,
      }).populate('groups', 'name type color');

      if (!device) {
        throw new AppError('Device not found', 404);
      }

      return device;
    } catch (error) {
      logger.error('Get device by ID failed', {
        error: error.message,
        deviceId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update device
   * @param {string} deviceId - Device ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Object} - Updated device
   */
  async updateDevice(deviceId, updateData, userId) {
    try {
      const device = await Device.findOne({
        _id: deviceId,
        owner: userId,
      });

      if (!device) {
        throw new AppError('Device not found', 404);
      }

      // Check if name is being updated and is unique
      if (updateData.name && updateData.name !== device.name) {
        const existingDevice = await Device.findOne({
          name: updateData.name,
          owner: userId,
          _id: { $ne: deviceId },
        });

        if (existingDevice) {
          throw new AppError('Device name already exists', 409);
        }
      }

      // Check if IP address is being updated and is unique
      if (updateData.ipAddress && updateData.ipAddress !== device.ipAddress) {
        const deviceWithSameIP = await Device.findOne({
          ipAddress: updateData.ipAddress,
          owner: userId,
          _id: { $ne: deviceId },
        });

        if (deviceWithSameIP) {
          throw new AppError('Device with this IP address already exists', 409);
        }
      }

      // Update device
      Object.assign(device, updateData);
      device.updatedAt = new Date();
      await device.save();

      logger.info(`Device updated: ${device.name}`, {
        deviceId: device._id,
        userId,
        updatedFields: Object.keys(updateData),
      });

      return device;
    } catch (error) {
      logger.error('Update device failed', {
        error: error.message,
        deviceId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete device
   * @param {string} deviceId - Device ID
   * @param {string} userId - User ID
   * @returns {Object} - Success message
   */
  async deleteDevice(deviceId, userId) {
    try {
      const device = await Device.findOne({
        _id: deviceId,
        owner: userId,
      });

      if (!device) {
        throw new AppError('Device not found', 404);
      }

      await Device.findByIdAndDelete(deviceId);

      logger.info(`Device deleted: ${device.name}`, {
        deviceId: device._id,
        userId,
        deviceName: device.name,
      });

      return { message: 'Device deleted successfully' };
    } catch (error) {
      logger.error('Delete device failed', {
        error: error.message,
        deviceId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Control device (turn on/off, toggle, etc.)
   * @param {string} deviceId - Device ID
   * @param {string} action - Control action
   * @param {Object} settings - Device settings
   * @param {string} userId - User ID
   * @returns {Object} - Updated device
   */
  async controlDevice(deviceId, action, settings = {}, userId) {
    try {
      const device = await Device.findOne({
        _id: deviceId,
        owner: userId,
      });

      if (!device) {
        throw new AppError('Device not found', 404);
      }

      if (!device.isOnline) {
        throw new AppError('Device is offline', 400);
      }

      // Validate action based on device capabilities
      switch (action) {
        case 'turn_on':
        case 'turn_off':
        case 'toggle':
          if (!device.capabilities.canToggle) {
            throw new AppError('Device does not support toggle functionality', 400);
          }
          break;
        case 'set_brightness':
          if (!device.capabilities.canDim) {
            throw new AppError('Device does not support dimming', 400);
          }
          break;
        case 'set_color':
          if (!device.capabilities.canChangeColor) {
            throw new AppError('Device does not support color changing', 400);
          }
          break;
        case 'set_temperature':
          if (!device.capabilities.canSetTemperature) {
            throw new AppError('Device does not support temperature control', 400);
          }
          break;
        default:
          throw new AppError('Invalid action', 400);
      }

      // Apply action
      switch (action) {
        case 'turn_on':
          device.powerState = POWER_STATES.ON;
          break;
        case 'turn_off':
          device.powerState = POWER_STATES.OFF;
          break;
        case 'toggle':
          device.powerState = device.powerState === POWER_STATES.ON ? POWER_STATES.OFF : POWER_STATES.ON;
          break;
        case 'set_brightness':
        case 'set_color':
        case 'set_temperature':
        case 'set_speed':
        case 'set_volume':
        case 'set_mode':
          // Update settings
          Object.assign(device.settings, settings);
          break;
      }

      device.status = DEVICE_STATUS.ACTIVE;
      device.lastControlled = new Date();
      await device.save();

      // Here you would typically send the command to the actual device
      // via the appropriate protocol (HTTP, MQTT, etc.)
      await this._sendDeviceCommand(device, action, settings);

      logger.info(`Device controlled: ${device.name}`, {
        deviceId: device._id,
        userId,
        action,
        settings,
        newPowerState: device.powerState,
      });

      return device;
    } catch (error) {
      logger.error('Device control failed', {
        error: error.message,
        deviceId,
        userId,
        action,
      });
      throw error;
    }
  }

  /**
   * Update device settings
   * @param {string} deviceId - Device ID
   * @param {Object} settings - New settings
   * @param {string} userId - User ID
   * @returns {Object} - Updated device
   */
  async updateDeviceSettings(deviceId, settings, userId) {
    try {
      const device = await Device.findOne({
        _id: deviceId,
        owner: userId,
      });

      if (!device) {
        throw new AppError('Device not found', 404);
      }

      // Validate settings based on device capabilities
      if (settings.brightness !== undefined && !device.capabilities.canDim) {
        throw new AppError('Device does not support brightness control', 400);
      }

      if (settings.color !== undefined && !device.capabilities.canChangeColor) {
        throw new AppError('Device does not support color control', 400);
      }

      if (settings.temperature !== undefined && !device.capabilities.canSetTemperature) {
        throw new AppError('Device does not support temperature control', 400);
      }

      if (settings.speed !== undefined && !device.capabilities.canSetSpeed) {
        throw new AppError('Device does not support speed control', 400);
      }

      // Update settings
      Object.assign(device.settings, settings);
      device.lastControlled = new Date();
      await device.save();

      // Send settings to actual device
      await this._sendDeviceCommand(device, 'update_settings', settings);

      logger.info(`Device settings updated: ${device.name}`, {
        deviceId: device._id,
        userId,
        settings,
      });

      return device;
    } catch (error) {
      logger.error('Update device settings failed', {
        error: error.message,
        deviceId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update device status (from device itself)
   * @param {string} deviceId - Device ID
   * @param {Object} statusData - Status data from device
   * @returns {Object} - Updated device
   */
  async updateDeviceStatus(deviceId, statusData) {
    try {
      const device = await Device.findById(deviceId);

      if (!device) {
        throw new AppError('Device not found', 404);
      }

      // Update status fields
      if (statusData.status !== undefined) {
        device.status = statusData.status;
      }

      if (statusData.powerState !== undefined) {
        device.powerState = statusData.powerState;
      }

      if (statusData.isOnline !== undefined) {
        device.isOnline = statusData.isOnline;
      }

      if (statusData.settings) {
        Object.assign(device.settings, statusData.settings);
      }

      if (statusData.energy) {
        device.energy.currentUsage = statusData.energy.currentUsage;
        device.energy.unit = statusData.energy.unit || device.energy.unit;
        device.energy.history.push({
          usage: statusData.energy.currentUsage,
          timestamp: statusData.timestamp || new Date(),
        });

        // Keep only last 1000 history entries
        if (device.energy.history.length > 1000) {
          device.energy.history = device.energy.history.slice(-1000);
        }
      }

      device.lastSeen = statusData.timestamp || new Date();
      await device.save();

      logger.debug(`Device status updated: ${device.name}`, {
        deviceId: device._id,
        status: device.status,
        powerState: device.powerState,
        isOnline: device.isOnline,
      });

      return device;
    } catch (error) {
      logger.error('Update device status failed', {
        error: error.message,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Create device timer
   * @param {string} deviceId - Device ID
   * @param {Object} timerData - Timer data
   * @param {string} userId - User ID
   * @returns {Object} - Created timer
   */
  async createDeviceTimer(deviceId, timerData, userId) {
    try {
      const device = await Device.findOne({
        _id: deviceId,
        owner: userId,
      });

      if (!device) {
        throw new AppError('Device not found', 404);
      }

      if (!device.capabilities.canSetTimer) {
        throw new AppError('Device does not support timers', 400);
      }

      const timer = {
        id: Date.now().toString(),
        ...timerData,
        createdAt: new Date(),
        isActive: true,
      };

      device.timers.push(timer);
      await device.save();

      // Schedule the timer (you would implement actual scheduling logic here)
      await this._scheduleDeviceTimer(device, timer);

      logger.info(`Device timer created: ${device.name}`, {
        deviceId: device._id,
        userId,
        timerId: timer.id,
        timerName: timer.name,
      });

      return timer;
    } catch (error) {
      logger.error('Create device timer failed', {
        error: error.message,
        deviceId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get device statistics
   * @param {string} userId - User ID
   * @returns {Object} - Device statistics
   */
  async getDeviceStatistics(userId) {
    try {
      const stats = await Device.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: null,
            totalDevices: { $sum: 1 },
            onlineDevices: {
              $sum: { $cond: [{ $eq: ['$isOnline', true] }, 1, 0] }
            },
            activeDevices: {
              $sum: { $cond: [{ $eq: ['$powerState', 'on'] }, 1, 0] }
            },
            offlineDevices: {
              $sum: { $cond: [{ $eq: ['$isOnline', false] }, 1, 0] }
            },
          },
        },
      ]);

      // Get device type breakdown
      const typeStats = await Device.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            online: {
              $sum: { $cond: [{ $eq: ['$isOnline', true] }, 1, 0] }
            },
          },
        },
      ]);

      const statistics = stats[0] || {
        totalDevices: 0,
        onlineDevices: 0,
        activeDevices: 0,
        offlineDevices: 0,
      };

      statistics.deviceTypes = typeStats.reduce((acc, type) => {
        acc[type._id] = {
          count: type.count,
          online: type.online,
        };
        return acc;
      }, {});

      logger.info('Device statistics retrieved', {
        userId,
        statistics,
      });

      return statistics;
    } catch (error) {
      logger.error('Get device statistics failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Bulk device actions
   * @param {Array} deviceIds - Array of device IDs
   * @param {string} action - Action to perform
   * @param {Object} settings - Settings for the action
   * @param {string} userId - User ID
   * @returns {Object} - Bulk action results
   */
  async bulkDeviceAction(deviceIds, action, settings = {}, userId) {
    try {
      const devices = await Device.find({
        _id: { $in: deviceIds },
        owner: userId,
      });

      if (devices.length === 0) {
        throw new AppError('No devices found', 404);
      }

      const results = {
        success: [],
        failed: [],
      };

      for (const device of devices) {
        try {
          if (action === 'delete') {
            await Device.findByIdAndDelete(device._id);
            results.success.push({
              deviceId: device._id,
              deviceName: device.name,
              message: 'Device deleted successfully',
            });
          } else {
            await this.controlDevice(device._id, action, settings, userId);
            results.success.push({
              deviceId: device._id,
              deviceName: device.name,
              message: `Action ${action} completed successfully`,
            });
          }
        } catch (error) {
          results.failed.push({
            deviceId: device._id,
            deviceName: device.name,
            error: error.message,
          });
        }
      }

      logger.info(`Bulk device action completed: ${action}`, {
        userId,
        totalDevices: deviceIds.length,
        successful: results.success.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      logger.error('Bulk device action failed', {
        error: error.message,
        deviceIds,
        action,
        userId,
      });
      throw error;
    }
  }

  /**
   * Private method to send commands to actual devices
   * @param {Object} device - Device object
   * @param {string} action - Action to perform
   * @param {Object} settings - Command settings
   * @private
   */
  async _sendDeviceCommand(device, action, settings = {}) {
    // This is where you would implement the actual device communication
    // For example, sending HTTP requests, MQTT messages, or other protocols
    
    logger.debug(`Sending command to device: ${device.name}`, {
      deviceId: device._id,
      action,
      settings,
      ipAddress: device.ipAddress,
      type: device.type,
    });

    // Simulate command sending
    return new Promise((resolve) => {
      setTimeout(resolve, 100); // Simulate network delay
    });
  }

  /**
   * Private method to schedule device timers
   * @param {Object} device - Device object
   * @param {Object} timer - Timer object
   * @private
   */
  async _scheduleDeviceTimer(device, timer) {
    // This is where you would implement timer scheduling
    // For example, using node-cron or a job queue
    
    logger.debug(`Scheduling timer for device: ${device.name}`, {
      deviceId: device._id,
      timerId: timer.id,
      scheduledTime: timer.scheduledTime,
    });

    // Simulate timer scheduling
    return Promise.resolve();
  }
}

export default new DeviceService();
