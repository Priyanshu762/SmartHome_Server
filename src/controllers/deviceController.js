import { deviceService, analyticsService } from '../services/index.js';
import { deviceValidator } from '../validators/index.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { validateRequest } from '../helpers/helpers.js';

/**
 * Device Controller
 * Handles device management, control, and monitoring operations
 */
class DeviceController {
  /**
   * Get user devices
   * @route GET /api/v1/devices
   */
  async getDevices(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        type = '',
        status = '',
        room = '',
        manufacturer = '',
        sortBy = 'name',
        sortOrder = 'asc',
        search = '',
      } = req.query;

      const userId = req.user.id;
      const filters = { type, status, room, manufacturer, search };
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
      };

      const result = await deviceService.getUserDevices(userId, filters, options);

      logger.debug('User devices retrieved', {
        userId,
        count: result.devices.length,
        total: result.pagination.total,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Get devices failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Get device by ID
   * @route GET /api/v1/devices/:deviceId
   */
  async getDeviceById(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      const device = await deviceService.getDeviceById(deviceId, userId);

      res.json({
        success: true,
        data: { device },
      });
    } catch (error) {
      logger.error('Get device by ID failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Create new device
   * @route POST /api/v1/devices
   */
  async createDevice(req, res, next) {
    try {
      // Validate request
      const validationError = validateRequest(deviceValidator.createDevice, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const userId = req.user.id;
      const deviceData = req.body;

      const device = await deviceService.createDevice(deviceData, userId);

      // Track device creation
      await analyticsService.trackEvent(userId, {
        type: 'device_created',
        category: 'device',
        action: 'create',
        label: device._id,
        metadata: {
          deviceType: device.type,
          manufacturer: device.manufacturer,
        },
      });

      logger.info('Device created', {
        userId,
        deviceId: device._id,
        type: device.type,
        name: device.name,
      });

      res.status(201).json({
        success: true,
        message: 'Device created successfully',
        data: { device },
      });
    } catch (error) {
      logger.error('Create device failed', {
        error: error.message,
        userId: req.user?.id,
        deviceName: req.body.name,
      });
      next(error);
    }
  }

  /**
   * Update device
   * @route PUT /api/v1/devices/:deviceId
   */
  async updateDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(deviceValidator.updateDevice, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const updateData = req.body;

      const device = await deviceService.updateDevice(deviceId, updateData, userId);

      // Track device update
      await analyticsService.trackEvent(userId, {
        type: 'device_updated',
        category: 'device',
        action: 'update',
        label: deviceId,
        metadata: {
          updatedFields: Object.keys(updateData),
        },
      });

      logger.info('Device updated', {
        userId,
        deviceId,
        updatedFields: Object.keys(updateData),
      });

      res.json({
        success: true,
        message: 'Device updated successfully',
        data: { device },
      });
    } catch (error) {
      logger.error('Update device failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Delete device
   * @route DELETE /api/v1/devices/:deviceId
   */
  async deleteDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      await deviceService.deleteDevice(deviceId, userId);

      // Track device deletion
      await analyticsService.trackEvent(userId, {
        type: 'device_deleted',
        category: 'device',
        action: 'delete',
        label: deviceId,
      });

      logger.info('Device deleted', {
        userId,
        deviceId,
      });

      res.json({
        success: true,
        message: 'Device deleted successfully',
      });
    } catch (error) {
      logger.error('Delete device failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Control device
   * @route POST /api/v1/devices/:deviceId/control
   */
  async controlDevice(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(deviceValidator.controlDevice, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { action, parameters = {} } = req.body;

      const result = await deviceService.controlDevice(deviceId, action, parameters, userId);

      // Track device control
      await analyticsService.trackDeviceUsage(userId, deviceId, {
        action,
        parameters,
        duration: result.duration || 0,
        powerConsumption: result.powerConsumption || 0,
      });

      logger.info('Device controlled', {
        userId,
        deviceId,
        action,
        success: result.success,
      });

      res.json({
        success: true,
        message: 'Device control executed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Control device failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
        action: req.body.action,
      });
      next(error);
    }
  }

  /**
   * Get device status
   * @route GET /api/v1/devices/:deviceId/status
   */
  async getDeviceStatus(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      const status = await deviceService.getDeviceStatus(deviceId, userId);

      res.json({
        success: true,
        data: { status },
      });
    } catch (error) {
      logger.error('Get device status failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Update device status
   * @route PUT /api/v1/devices/:deviceId/status
   */
  async updateDeviceStatus(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(deviceValidator.updateDeviceStatus, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const statusUpdate = req.body;

      const device = await deviceService.updateDeviceStatus(deviceId, statusUpdate, userId);

      logger.debug('Device status updated', {
        userId,
        deviceId,
        statusUpdate,
      });

      res.json({
        success: true,
        message: 'Device status updated successfully',
        data: { device },
      });
    } catch (error) {
      logger.error('Update device status failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Get device history
   * @route GET /api/v1/devices/:deviceId/history
   */
  async getDeviceHistory(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;
      const {
        page = 1,
        limit = 50,
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

      const history = await deviceService.getDeviceHistory(deviceId, userId, options);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Get device history failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Set device timer
   * @route POST /api/v1/devices/:deviceId/timer
   */
  async setDeviceTimer(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(deviceValidator.setDeviceTimer, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const timerData = req.body;

      const timer = await deviceService.setDeviceTimer(deviceId, timerData, userId);

      logger.info('Device timer set', {
        userId,
        deviceId,
        timerId: timer.id,
        duration: timerData.duration,
      });

      res.status(201).json({
        success: true,
        message: 'Device timer set successfully',
        data: { timer },
      });
    } catch (error) {
      logger.error('Set device timer failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Get device timers
   * @route GET /api/v1/devices/:deviceId/timers
   */
  async getDeviceTimers(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      const timers = await deviceService.getDeviceTimers(deviceId, userId);

      res.json({
        success: true,
        data: { timers },
      });
    } catch (error) {
      logger.error('Get device timers failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Cancel device timer
   * @route DELETE /api/v1/devices/:deviceId/timers/:timerId
   */
  async cancelDeviceTimer(req, res, next) {
    try {
      const { deviceId, timerId } = req.params;
      const userId = req.user.id;

      await deviceService.cancelDeviceTimer(deviceId, timerId, userId);

      logger.info('Device timer cancelled', {
        userId,
        deviceId,
        timerId,
      });

      res.json({
        success: true,
        message: 'Device timer cancelled successfully',
      });
    } catch (error) {
      logger.error('Cancel device timer failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
        timerId: req.params.timerId,
      });
      next(error);
    }
  }

  /**
   * Bulk control devices
   * @route POST /api/v1/devices/bulk-control
   */
  async bulkControlDevices(req, res, next) {
    try {
      const userId = req.user.id;

      // Validate request
      const validationError = validateRequest(deviceValidator.bulkControlDevices, req.body);
      if (validationError) {
        throw new AppError(validationError.message, 400);
      }

      const { deviceIds, action, parameters = {} } = req.body;

      const results = await deviceService.bulkControlDevices(deviceIds, action, parameters, userId);

      // Track bulk control
      await analyticsService.trackEvent(userId, {
        type: 'bulk_device_control',
        category: 'device',
        action: 'bulk_control',
        value: deviceIds.length,
        metadata: {
          action,
          deviceCount: deviceIds.length,
          successful: results.successful.length,
          failed: results.failed.length,
        },
      });

      logger.info('Bulk device control executed', {
        userId,
        action,
        deviceCount: deviceIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
      });

      res.json({
        success: true,
        message: 'Bulk device control completed',
        data: results,
      });
    } catch (error) {
      logger.error('Bulk control devices failed', {
        error: error.message,
        userId: req.user?.id,
        action: req.body.action,
      });
      next(error);
    }
  }

  /**
   * Get device statistics
   * @route GET /api/v1/devices/statistics
   */
  async getDeviceStatistics(req, res, next) {
    try {
      const userId = req.user.id;
      const { timeRange = 30 } = req.query;

      const statistics = await deviceService.getDeviceStatistics(userId, parseInt(timeRange));

      res.json({
        success: true,
        data: { statistics },
      });
    } catch (error) {
      logger.error('Get device statistics failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Discover devices
   * @route POST /api/v1/devices/discover
   */
  async discoverDevices(req, res, next) {
    try {
      const userId = req.user.id;
      const { network = 'local', protocols = ['upnp', 'mdns'] } = req.body;

      const discoveredDevices = await deviceService.discoverDevices(userId, {
        network,
        protocols,
      });

      logger.info('Device discovery completed', {
        userId,
        discoveredCount: discoveredDevices.length,
        protocols,
      });

      res.json({
        success: true,
        message: 'Device discovery completed',
        data: { devices: discoveredDevices },
      });
    } catch (error) {
      logger.error('Device discovery failed', {
        error: error.message,
        userId: req.user?.id,
      });
      next(error);
    }
  }

  /**
   * Test device connection
   * @route POST /api/v1/devices/:deviceId/test
   */
  async testDeviceConnection(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      const testResult = await deviceService.testDeviceConnection(deviceId, userId);

      logger.info('Device connection tested', {
        userId,
        deviceId,
        success: testResult.success,
        responseTime: testResult.responseTime,
      });

      res.json({
        success: true,
        message: 'Device connection test completed',
        data: testResult,
      });
    } catch (error) {
      logger.error('Test device connection failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Get device capabilities
   * @route GET /api/v1/devices/:deviceId/capabilities
   */
  async getDeviceCapabilities(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      const capabilities = await deviceService.getDeviceCapabilities(deviceId, userId);

      res.json({
        success: true,
        data: { capabilities },
      });
    } catch (error) {
      logger.error('Get device capabilities failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Update device firmware
   * @route POST /api/v1/devices/:deviceId/firmware-update
   */
  async updateDeviceFirmware(req, res, next) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;
      const { version, url, autoUpdate = false } = req.body;

      const updateResult = await deviceService.updateDeviceFirmware(deviceId, {
        version,
        url,
        autoUpdate,
      }, userId);

      logger.info('Device firmware update initiated', {
        userId,
        deviceId,
        version,
        autoUpdate,
      });

      res.json({
        success: true,
        message: 'Firmware update initiated',
        data: updateResult,
      });
    } catch (error) {
      logger.error('Update device firmware failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }

  /**
   * Get device energy usage
   * @route GET /api/v1/devices/:deviceId/energy
   */
  async getDeviceEnergyUsage(req, res, next) {
    try {
      const { deviceId } = req.params;
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

      const energyData = await deviceService.getDeviceEnergyUsage(deviceId, userId, options);

      res.json({
        success: true,
        data: energyData,
      });
    } catch (error) {
      logger.error('Get device energy usage failed', {
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId,
      });
      next(error);
    }
  }
}

export default new DeviceController();
