import Group from '../models/Group.js';
import Device from '../models/Device.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import deviceService from './deviceService.js';

/**
 * Group Service
 * Handles group-related business logic including CRUD operations,
 * device management, and group automation
 */
class GroupService {
  /**
   * Create a new group
   * @param {Object} groupData - Group creation data
   * @param {string} userId - User ID who owns the group
   * @returns {Object} - Created group
   */
  async createGroup(groupData, userId) {
    try {
      // Check if group name is unique for the user
      const existingGroup = await Group.findOne({
        name: groupData.name,
        owner: userId,
      });

      if (existingGroup) {
        throw new AppError('Group name already exists', 409);
      }

      // Validate devices belong to the user
      if (groupData.devices && groupData.devices.length > 0) {
        const userDevices = await Device.find({
          _id: { $in: groupData.devices },
          owner: userId,
        });

        if (userDevices.length !== groupData.devices.length) {
          throw new AppError('Some devices do not belong to you', 400);
        }
      }

      // Create group
      const group = new Group({
        ...groupData,
        owner: userId,
      });

      await group.save();

      // Update devices to include this group
      if (groupData.devices && groupData.devices.length > 0) {
        await Device.updateMany(
          { _id: { $in: groupData.devices } },
          { $addToSet: { groups: group._id } }
        );
      }

      logger.info(`Group created: ${group.name}`, {
        groupId: group._id,
        userId,
        deviceCount: groupData.devices?.length || 0,
      });

      return await this.getGroupById(group._id, userId);
    } catch (error) {
      logger.error('Group creation failed', {
        error: error.message,
        groupName: groupData.name,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get groups for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Search filters
   * @param {Object} pagination - Pagination options
   * @returns {Object} - Groups list with pagination
   */
  async getUserGroups(userId, filters = {}, pagination = {}) {
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

      if (filters.hasDevices !== undefined) {
        if (filters.hasDevices) {
          query.devices = { $exists: true, $not: { $size: 0 } };
        } else {
          query.$or = [
            { devices: { $exists: false } },
            { devices: { $size: 0 } },
          ];
        }
      }

      if (filters.deviceCount) {
        if (filters.deviceCount.min !== undefined) {
          query['devices.' + (filters.deviceCount.min - 1)] = { $exists: true };
        }
        if (filters.deviceCount.max !== undefined) {
          query['devices.' + filters.deviceCount.max] = { $exists: false };
        }
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      // Get groups
      const groups = await Group.find(query)
        .populate({
          path: 'devices',
          select: 'name type status powerState isOnline',
        })
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      const total = await Group.countDocuments(query);

      logger.info('User groups retrieved', {
        userId,
        count: groups.length,
        total,
        page,
        filters,
      });

      return {
        groups,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get user groups failed', {
        error: error.message,
        userId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get group by ID
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Object} - Group details
   */
  async getGroupById(groupId, userId) {
    try {
      const group = await Group.findOne({
        _id: groupId,
        owner: userId,
      }).populate({
        path: 'devices',
        select: 'name type status powerState isOnline settings capabilities location',
      });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      return group;
    } catch (error) {
      logger.error('Get group by ID failed', {
        error: error.message,
        groupId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update group
   * @param {string} groupId - Group ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Object} - Updated group
   */
  async updateGroup(groupId, updateData, userId) {
    try {
      const group = await Group.findOne({
        _id: groupId,
        owner: userId,
      });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // Check if name is being updated and is unique
      if (updateData.name && updateData.name !== group.name) {
        const existingGroup = await Group.findOne({
          name: updateData.name,
          owner: userId,
          _id: { $ne: groupId },
        });

        if (existingGroup) {
          throw new AppError('Group name already exists', 409);
        }
      }

      // Validate devices belong to the user if devices are being updated
      if (updateData.devices) {
        const userDevices = await Device.find({
          _id: { $in: updateData.devices },
          owner: userId,
        });

        if (userDevices.length !== updateData.devices.length) {
          throw new AppError('Some devices do not belong to you', 400);
        }

        // Remove group from old devices
        await Device.updateMany(
          { groups: groupId },
          { $pull: { groups: groupId } }
        );

        // Add group to new devices
        await Device.updateMany(
          { _id: { $in: updateData.devices } },
          { $addToSet: { groups: groupId } }
        );
      }

      // Update group
      Object.assign(group, updateData);
      group.updatedAt = new Date();
      await group.save();

      logger.info(`Group updated: ${group.name}`, {
        groupId: group._id,
        userId,
        updatedFields: Object.keys(updateData),
      });

      return await this.getGroupById(groupId, userId);
    } catch (error) {
      logger.error('Update group failed', {
        error: error.message,
        groupId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete group
   * @param {string} groupId - Group ID
   * @param {string} userId - User ID
   * @returns {Object} - Success message
   */
  async deleteGroup(groupId, userId) {
    try {
      const group = await Group.findOne({
        _id: groupId,
        owner: userId,
      });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // Remove group from all devices
      await Device.updateMany(
        { groups: groupId },
        { $pull: { groups: groupId } }
      );

      await Group.findByIdAndDelete(groupId);

      logger.info(`Group deleted: ${group.name}`, {
        groupId: group._id,
        userId,
        groupName: group.name,
      });

      return { message: 'Group deleted successfully' };
    } catch (error) {
      logger.error('Delete group failed', {
        error: error.message,
        groupId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Add devices to group
   * @param {string} groupId - Group ID
   * @param {Array} deviceIds - Array of device IDs to add
   * @param {string} userId - User ID
   * @returns {Object} - Updated group
   */
  async addDevicesToGroup(groupId, deviceIds, userId) {
    try {
      const group = await Group.findOne({
        _id: groupId,
        owner: userId,
      });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // Validate devices belong to the user
      const userDevices = await Device.find({
        _id: { $in: deviceIds },
        owner: userId,
      });

      if (userDevices.length !== deviceIds.length) {
        throw new AppError('Some devices do not belong to you', 400);
      }

      // Check group device limit
      if (group.settings?.maxDevices) {
        const totalDevices = group.devices.length + deviceIds.filter(id => !group.devices.includes(id)).length;
        if (totalDevices > group.settings.maxDevices) {
          throw new AppError(`Group cannot have more than ${group.settings.maxDevices} devices`, 400);
        }
      }

      // Add devices to group
      group.devices = [...new Set([...group.devices.map(d => d.toString()), ...deviceIds])];
      await group.save();

      // Update devices to include this group
      await Device.updateMany(
        { _id: { $in: deviceIds } },
        { $addToSet: { groups: groupId } }
      );

      logger.info(`Devices added to group: ${group.name}`, {
        groupId: group._id,
        userId,
        deviceIds,
        totalDevices: group.devices.length,
      });

      return await this.getGroupById(groupId, userId);
    } catch (error) {
      logger.error('Add devices to group failed', {
        error: error.message,
        groupId,
        deviceIds,
        userId,
      });
      throw error;
    }
  }

  /**
   * Remove devices from group
   * @param {string} groupId - Group ID
   * @param {Array} deviceIds - Array of device IDs to remove
   * @param {string} userId - User ID
   * @returns {Object} - Updated group
   */
  async removeDevicesFromGroup(groupId, deviceIds, userId) {
    try {
      const group = await Group.findOne({
        _id: groupId,
        owner: userId,
      });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // Remove devices from group
      group.devices = group.devices.filter(deviceId => !deviceIds.includes(deviceId.toString()));
      await group.save();

      // Update devices to remove this group
      await Device.updateMany(
        { _id: { $in: deviceIds } },
        { $pull: { groups: groupId } }
      );

      logger.info(`Devices removed from group: ${group.name}`, {
        groupId: group._id,
        userId,
        deviceIds,
        remainingDevices: group.devices.length,
      });

      return await this.getGroupById(groupId, userId);
    } catch (error) {
      logger.error('Remove devices from group failed', {
        error: error.message,
        groupId,
        deviceIds,
        userId,
      });
      throw error;
    }
  }

  /**
   * Control group devices
   * @param {string} groupId - Group ID
   * @param {Object} controlData - Control data
   * @param {string} userId - User ID
   * @returns {Object} - Control results
   */
  async controlGroup(groupId, controlData, userId) {
    try {
      const group = await Group.findOne({
        _id: groupId,
        owner: userId,
      }).populate('devices');

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      if (!group.devices || group.devices.length === 0) {
        throw new AppError('Group has no devices', 400);
      }

      const { action, target = 'all', deviceIds, randomCount, settings = {}, delay = 0, sequence } = controlData;

      let targetDevices = [];

      // Determine target devices
      switch (target) {
        case 'all':
          targetDevices = group.devices;
          break;
        case 'specific':
          if (!deviceIds || deviceIds.length === 0) {
            throw new AppError('Device IDs required for specific target', 400);
          }
          targetDevices = group.devices.filter(device => deviceIds.includes(device._id.toString()));
          break;
        case 'random':
          if (!randomCount || randomCount < 1) {
            throw new AppError('Random count required for random target', 400);
          }
          const shuffled = [...group.devices].sort(() => 0.5 - Math.random());
          targetDevices = shuffled.slice(0, Math.min(randomCount, group.devices.length));
          break;
        default:
          throw new AppError('Invalid target type', 400);
      }

      const results = {
        success: [],
        failed: [],
        totalDevices: targetDevices.length,
      };

      // Apply delay if specified
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
      }

      // Execute control action
      if (sequence?.enabled) {
        // Sequential execution with interval
        for (let i = 0; i < targetDevices.length; i++) {
          const device = targetDevices[i];
          try {
            await deviceService.controlDevice(device._id, action, settings, userId);
            results.success.push({
              deviceId: device._id,
              deviceName: device.name,
            });
          } catch (error) {
            results.failed.push({
              deviceId: device._id,
              deviceName: device.name,
              error: error.message,
            });
          }

          // Apply interval delay between devices (except for last device)
          if (i < targetDevices.length - 1 && sequence.interval > 0) {
            await new Promise(resolve => setTimeout(resolve, sequence.interval));
          }
        }
      } else {
        // Parallel execution
        const controlPromises = targetDevices.map(async (device) => {
          try {
            await deviceService.controlDevice(device._id, action, settings, userId);
            return {
              success: true,
              deviceId: device._id,
              deviceName: device.name,
            };
          } catch (error) {
            return {
              success: false,
              deviceId: device._id,
              deviceName: device.name,
              error: error.message,
            };
          }
        });

        const controlResults = await Promise.all(controlPromises);

        controlResults.forEach(result => {
          if (result.success) {
            results.success.push({
              deviceId: result.deviceId,
              deviceName: result.deviceName,
            });
          } else {
            results.failed.push({
              deviceId: result.deviceId,
              deviceName: result.deviceName,
              error: result.error,
            });
          }
        });
      }

      // Update group last activity
      group.lastActivity = new Date();
      await group.save();

      logger.info(`Group control executed: ${group.name}`, {
        groupId: group._id,
        userId,
        action,
        target,
        successful: results.success.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      logger.error('Group control failed', {
        error: error.message,
        groupId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Activate group scene
   * @param {string} groupId - Group ID
   * @param {string} sceneId - Scene ID
   * @param {string} userId - User ID
   * @returns {Object} - Activation results
   */
  async activateGroupScene(groupId, sceneId, userId) {
    try {
      const group = await Group.findOne({
        _id: groupId,
        owner: userId,
      }).populate('devices');

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      const scene = group.scenes?.find(s => s._id.toString() === sceneId);
      if (!scene) {
        throw new AppError('Scene not found', 404);
      }

      const results = {
        success: [],
        failed: [],
        sceneName: scene.name,
      };

      // Apply scene device states
      for (const deviceState of scene.deviceStates) {
        try {
          const device = group.devices.find(d => d._id.toString() === deviceState.deviceId.toString());
          if (!device) {
            results.failed.push({
              deviceId: deviceState.deviceId,
              error: 'Device not found in group',
            });
            continue;
          }

          // Apply power state
          if (deviceState.powerState) {
            const action = deviceState.powerState === 'on' ? 'turn_on' : 'turn_off';
            await deviceService.controlDevice(device._id, action, {}, userId);
          }

          // Apply settings
          if (deviceState.settings) {
            await deviceService.updateDeviceSettings(device._id, deviceState.settings, userId);
          }

          results.success.push({
            deviceId: device._id,
            deviceName: device.name,
          });
        } catch (error) {
          results.failed.push({
            deviceId: deviceState.deviceId,
            error: error.message,
          });
        }
      }

      // Update group last activity
      group.lastActivity = new Date();
      await group.save();

      logger.info(`Group scene activated: ${group.name} - ${scene.name}`, {
        groupId: group._id,
        sceneId,
        userId,
        successful: results.success.length,
        failed: results.failed.length,
      });

      return results;
    } catch (error) {
      logger.error('Group scene activation failed', {
        error: error.message,
        groupId,
        sceneId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create group scene
   * @param {string} groupId - Group ID
   * @param {Object} sceneData - Scene data
   * @param {string} userId - User ID
   * @returns {Object} - Created scene
   */
  async createGroupScene(groupId, sceneData, userId) {
    try {
      const group = await Group.findOne({
        _id: groupId,
        owner: userId,
      }).populate('devices');

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      // Validate device states belong to group devices
      const groupDeviceIds = group.devices.map(d => d._id.toString());
      for (const deviceState of sceneData.deviceStates) {
        if (!groupDeviceIds.includes(deviceState.deviceId.toString())) {
          throw new AppError('Device not found in group', 400);
        }
      }

      const scene = {
        _id: Date.now().toString(),
        ...sceneData,
        createdAt: new Date(),
      };

      if (!group.scenes) {
        group.scenes = [];
      }

      group.scenes.push(scene);
      await group.save();

      logger.info(`Group scene created: ${group.name} - ${scene.name}`, {
        groupId: group._id,
        sceneId: scene._id,
        userId,
        deviceCount: scene.deviceStates.length,
      });

      return scene;
    } catch (error) {
      logger.error('Create group scene failed', {
        error: error.message,
        groupId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get group statistics
   * @param {string} userId - User ID
   * @returns {Object} - Group statistics
   */
  async getGroupStatistics(userId) {
    try {
      const stats = await Group.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: null,
            totalGroups: { $sum: 1 },
            activeGroups: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            groupsWithDevices: {
              $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$devices', []] } }, 0] }, 1, 0] }
            },
            totalDevicesInGroups: {
              $sum: { $size: { $ifNull: ['$devices', []] } }
            },
          },
        },
      ]);

      // Get group type breakdown
      const typeStats = await Group.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            averageDevices: {
              $avg: { $size: { $ifNull: ['$devices', []] } }
            },
          },
        },
      ]);

      const statistics = stats[0] || {
        totalGroups: 0,
        activeGroups: 0,
        groupsWithDevices: 0,
        totalDevicesInGroups: 0,
      };

      statistics.groupTypes = typeStats.reduce((acc, type) => {
        acc[type._id] = {
          count: type.count,
          averageDevices: Math.round(type.averageDevices * 100) / 100,
        };
        return acc;
      }, {});

      statistics.emptyGroups = statistics.totalGroups - statistics.groupsWithDevices;

      logger.info('Group statistics retrieved', {
        userId,
        statistics,
      });

      return statistics;
    } catch (error) {
      logger.error('Get group statistics failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }
}

export default new GroupService();
