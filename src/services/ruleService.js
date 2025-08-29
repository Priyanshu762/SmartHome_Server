import Rule from '../models/Rule.js';
import Device from '../models/Device.js';
import Group from '../models/Group.js';
import Mode from '../models/Mode.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import deviceService from './deviceService.js';
import groupService from './groupService.js';
import modeService from './modeService.js';

/**
 * Rule Service
 * Handles automation rule-related business logic including CRUD operations,
 * rule execution, trigger management, and automation logic
 */
class RuleService {
  constructor() {
    this.activeRules = new Map(); // Store active rule listeners
    this.ruleExecutionHistory = new Map(); // Store execution history for cooldown
  }

  /**
   * Create a new rule
   * @param {Object} ruleData - Rule creation data
   * @param {string} userId - User ID who owns the rule
   * @returns {Object} - Created rule
   */
  async createRule(ruleData, userId) {
    try {
      // Check if rule name is unique for the user
      const existingRule = await Rule.findOne({
        name: ruleData.name,
        owner: userId,
      });

      if (existingRule) {
        throw new AppError('Rule name already exists', 409);
      }

      // Validate rule references
      await this._validateRuleReferences(ruleData, userId);

      // Create rule
      const rule = new Rule({
        ...ruleData,
        owner: userId,
        statistics: {
          executionCount: 0,
          successCount: 0,
          failureCount: 0,
          lastExecuted: null,
          averageExecutionTime: 0,
        },
      });

      await rule.save();

      // Setup rule triggers if active
      if (rule.isActive) {
        await this._setupRuleTriggers(rule);
      }

      logger.info(`Rule created: ${rule.name}`, {
        ruleId: rule._id,
        userId,
        type: rule.type,
        category: rule.category,
        triggersCount: rule.triggers?.length || 0,
        actionsCount: rule.actions?.length || 0,
      });

      return rule;
    } catch (error) {
      logger.error('Rule creation failed', {
        error: error.message,
        ruleName: ruleData.name,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get rules for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Search filters
   * @param {Object} pagination - Pagination options
   * @returns {Object} - Rules list with pagination
   */
  async getUserRules(userId, filters = {}, pagination = {}) {
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

      if (filters.category) {
        query.category = filters.category;
      }

      if (filters.isActive !== undefined) {
        query.isActive = filters.isActive;
      }

      if (filters.priority) {
        query.priority = filters.priority;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.triggerType) {
        query['triggers.type'] = filters.triggerType;
      }

      if (filters.actionType) {
        query['actions.type'] = filters.actionType;
      }

      // Get rules
      const rules = await Rule.find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit);

      const total = await Rule.countDocuments(query);

      logger.info('User rules retrieved', {
        userId,
        count: rules.length,
        total,
        page,
        filters,
      });

      return {
        rules,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get user rules failed', {
        error: error.message,
        userId,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get rule by ID
   * @param {string} ruleId - Rule ID
   * @param {string} userId - User ID
   * @returns {Object} - Rule details
   */
  async getRuleById(ruleId, userId) {
    try {
      const rule = await Rule.findOne({
        _id: ruleId,
        owner: userId,
      });

      if (!rule) {
        throw new AppError('Rule not found', 404);
      }

      return rule;
    } catch (error) {
      logger.error('Get rule by ID failed', {
        error: error.message,
        ruleId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update rule
   * @param {string} ruleId - Rule ID
   * @param {Object} updateData - Update data
   * @param {string} userId - User ID
   * @returns {Object} - Updated rule
   */
  async updateRule(ruleId, updateData, userId) {
    try {
      const rule = await Rule.findOne({
        _id: ruleId,
        owner: userId,
      });

      if (!rule) {
        throw new AppError('Rule not found', 404);
      }

      // Check if name is being updated and is unique
      if (updateData.name && updateData.name !== rule.name) {
        const existingRule = await Rule.findOne({
          name: updateData.name,
          owner: userId,
          _id: { $ne: ruleId },
        });

        if (existingRule) {
          throw new AppError('Rule name already exists', 409);
        }
      }

      // Validate rule references if being updated
      if (updateData.triggers || updateData.actions) {
        const updatedRuleData = { ...rule.toObject(), ...updateData };
        await this._validateRuleReferences(updatedRuleData, userId);
      }

      const wasActive = rule.isActive;

      // Update rule
      Object.assign(rule, updateData);
      rule.updatedAt = new Date();
      await rule.save();

      // Update rule triggers if active status changed or triggers/conditions changed
      if (rule.isActive !== wasActive || updateData.triggers || updateData.conditions) {
        if (wasActive) {
          this._removRuleTriggers(ruleId);
        }
        if (rule.isActive) {
          await this._setupRuleTriggers(rule);
        }
      }

      logger.info(`Rule updated: ${rule.name}`, {
        ruleId: rule._id,
        userId,
        updatedFields: Object.keys(updateData),
        wasActive,
        isActive: rule.isActive,
      });

      return rule;
    } catch (error) {
      logger.error('Update rule failed', {
        error: error.message,
        ruleId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete rule
   * @param {string} ruleId - Rule ID
   * @param {string} userId - User ID
   * @returns {Object} - Success message
   */
  async deleteRule(ruleId, userId) {
    try {
      const rule = await Rule.findOne({
        _id: ruleId,
        owner: userId,
      });

      if (!rule) {
        throw new AppError('Rule not found', 404);
      }

      // Remove rule triggers if active
      if (rule.isActive) {
        this._removRuleTriggers(ruleId);
      }

      await Rule.findByIdAndDelete(ruleId);

      logger.info(`Rule deleted: ${rule.name}`, {
        ruleId: rule._id,
        userId,
        ruleName: rule.name,
      });

      return { message: 'Rule deleted successfully' };
    } catch (error) {
      logger.error('Delete rule failed', {
        error: error.message,
        ruleId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Execute rule manually
   * @param {string} ruleId - Rule ID
   * @param {Object} options - Execution options
   * @param {string} userId - User ID
   * @returns {Object} - Execution results
   */
  async executeRule(ruleId, options = {}, userId) {
    try {
      const rule = await Rule.findOne({
        _id: ruleId,
        owner: userId,
      });

      if (!rule) {
        throw new AppError('Rule not found', 404);
      }

      // Check cooldown period
      if (!options.force && !this._checkCooldown(rule)) {
        throw new AppError('Rule is in cooldown period', 429);
      }

      // Check max executions limit
      if (!options.force && !this._checkExecutionLimit(rule)) {
        throw new AppError('Rule execution limit reached', 429);
      }

      // Evaluate conditions if not skipped
      let conditionsResult = true;
      if (!options.skipConditions && rule.conditions?.length > 0) {
        conditionsResult = await this._evaluateConditions(rule, options.context || {});
      }

      if (!conditionsResult) {
        logger.info(`Rule conditions not met: ${rule.name}`, {
          ruleId: rule._id,
          userId,
        });
        return {
          executed: false,
          reason: 'Conditions not met',
          conditionsResult,
        };
      }

      // Execute rule actions
      const startTime = Date.now();
      const executionResults = await this._executeRuleActions(rule, options.context || {});
      const executionTime = Date.now() - startTime;

      // Update rule statistics
      rule.statistics.executionCount += 1;
      rule.statistics.lastExecuted = new Date();
      
      if (executionResults.failed.length === 0) {
        rule.statistics.successCount += 1;
      } else {
        rule.statistics.failureCount += 1;
      }

      // Update average execution time
      const totalTime = rule.statistics.averageExecutionTime * (rule.statistics.executionCount - 1) + executionTime;
      rule.statistics.averageExecutionTime = Math.round(totalTime / rule.statistics.executionCount);

      // Add to execution history
      rule.executionHistory.push({
        timestamp: new Date(),
        triggered: options.triggeredBy || 'manual',
        success: executionResults.failed.length === 0,
        executionTime,
        conditionsResult,
        actionsExecuted: executionResults.success.length,
        actionsFailed: executionResults.failed.length,
      });

      // Keep only last 100 history entries
      if (rule.executionHistory.length > 100) {
        rule.executionHistory = rule.executionHistory.slice(-100);
      }

      await rule.save();

      // Update execution tracking for cooldown
      this._updateExecutionTracking(rule);

      logger.info(`Rule executed: ${rule.name}`, {
        ruleId: rule._id,
        userId,
        executionTime,
        successful: executionResults.success.length,
        failed: executionResults.failed.length,
        triggeredBy: options.triggeredBy || 'manual',
      });

      return {
        executed: true,
        executionTime,
        conditionsResult,
        executionResults,
        rule: {
          name: rule.name,
          statistics: rule.statistics,
        },
      };
    } catch (error) {
      logger.error('Rule execution failed', {
        error: error.message,
        ruleId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Test rule without executing actions
   * @param {string} ruleId - Rule ID
   * @param {Object} testData - Test data
   * @param {string} userId - User ID
   * @returns {Object} - Test results
   */
  async testRule(ruleId, testData = {}, userId) {
    try {
      const rule = await Rule.findOne({
        _id: ruleId,
        owner: userId,
      });

      if (!rule) {
        throw new AppError('Rule not found', 404);
      }

      const results = {
        triggers: [],
        conditions: [],
        actions: [],
        wouldExecute: false,
      };

      // Test triggers
      for (const trigger of rule.triggers || []) {
        if (!trigger.isEnabled) continue;

        let triggerResult = false;
        if (testData.mockTrigger && testData.mockTrigger.type === trigger.type) {
          triggerResult = await this._evaluateTrigger(trigger, testData.mockTrigger.data);
        }

        results.triggers.push({
          id: trigger.id,
          type: trigger.type,
          result: triggerResult,
        });
      }

      // Test conditions
      for (const condition of rule.conditions || []) {
        if (!condition.isEnabled) continue;

        let conditionResult = false;
        
        // Use mock result if provided
        const mockCondition = testData.mockConditions?.find(mc => mc.id === condition.id);
        if (mockCondition) {
          conditionResult = mockCondition.result;
        } else {
          conditionResult = await this._evaluateCondition(condition, {});
        }

        results.conditions.push({
          id: condition.id,
          type: condition.type,
          result: conditionResult,
        });
      }

      // Determine if rule would execute
      const triggerLogic = rule.settings?.triggerLogic || 'any';
      const conditionLogic = rule.settings?.conditionLogic || 'all';

      const triggersMet = results.triggers.length === 0 || 
        (triggerLogic === 'any' ? results.triggers.some(t => t.result) : results.triggers.every(t => t.result));

      const conditionsMet = results.conditions.length === 0 ||
        (conditionLogic === 'all' ? results.conditions.every(c => c.result) : results.conditions.some(c => c.result));

      results.wouldExecute = triggersMet && conditionsMet;

      // Test actions (dry run)
      if (testData.dryRun !== false) {
        for (const action of rule.actions || []) {
          if (!action.isEnabled) continue;

          results.actions.push({
            id: action.id,
            type: action.type,
            wouldExecute: results.wouldExecute,
            estimated: true,
          });
        }
      }

      logger.info(`Rule test completed: ${rule.name}`, {
        ruleId: rule._id,
        userId,
        wouldExecute: results.wouldExecute,
        triggersCount: results.triggers.length,
        conditionsCount: results.conditions.length,
      });

      return results;
    } catch (error) {
      logger.error('Rule test failed', {
        error: error.message,
        ruleId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get rule statistics
   * @param {string} userId - User ID
   * @returns {Object} - Rule statistics
   */
  async getRuleStatistics(userId) {
    try {
      const stats = await Rule.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: null,
            totalRules: { $sum: 1 },
            activeRules: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            totalExecutions: {
              $sum: '$statistics.executionCount'
            },
            totalSuccesses: {
              $sum: '$statistics.successCount'
            },
            totalFailures: {
              $sum: '$statistics.failureCount'
            },
            averageExecutionTime: {
              $avg: '$statistics.averageExecutionTime'
            },
          },
        },
      ]);

      // Get rule type and category breakdown
      const typeStats = await Rule.aggregate([
        { $match: { owner: userId } },
        {
          $group: {
            _id: { type: '$type', category: '$category' },
            count: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            executions: {
              $sum: '$statistics.executionCount'
            },
          },
        },
      ]);

      const statistics = stats[0] || {
        totalRules: 0,
        activeRules: 0,
        totalExecutions: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        averageExecutionTime: 0,
      };

      statistics.inactiveRules = statistics.totalRules - statistics.activeRules;
      statistics.successRate = statistics.totalExecutions > 0 
        ? Math.round((statistics.totalSuccesses / statistics.totalExecutions) * 100) 
        : 0;

      statistics.breakdown = typeStats.reduce((acc, item) => {
        const key = `${item._id.type}_${item._id.category}`;
        acc[key] = {
          type: item._id.type,
          category: item._id.category,
          count: item.count,
          active: item.active,
          executions: item.executions,
        };
        return acc;
      }, {});

      logger.info('Rule statistics retrieved', {
        userId,
        statistics,
      });

      return statistics;
    } catch (error) {
      logger.error('Get rule statistics failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Handle device state change trigger
   * @param {string} deviceId - Device ID
   * @param {Object} oldState - Previous device state
   * @param {Object} newState - New device state
   */
  async handleDeviceStateChange(deviceId, oldState, newState) {
    try {
      const affectedRules = await Rule.find({
        isActive: true,
        'triggers.type': 'device_state',
        'triggers.device.deviceId': deviceId,
      });

      for (const rule of affectedRules) {
        const deviceTriggers = rule.triggers.filter(
          t => t.type === 'device_state' && 
               t.device?.deviceId?.toString() === deviceId.toString() &&
               t.isEnabled
        );

        for (const trigger of deviceTriggers) {
          const triggered = await this._evaluateDeviceStateTrigger(trigger, oldState, newState);
          
          if (triggered) {
            await this.executeRule(rule._id, {
              triggeredBy: 'device_state_change',
              context: { deviceId, oldState, newState },
            }, rule.owner);
          }
        }
      }
    } catch (error) {
      logger.error('Handle device state change failed', {
        error: error.message,
        deviceId,
      });
    }
  }

  /**
   * Private method to validate rule references
   * @param {Object} ruleData - Rule data
   * @param {string} userId - User ID
   * @private
   */
  async _validateRuleReferences(ruleData, userId) {
    // Validate device references in triggers
    for (const trigger of ruleData.triggers || []) {
      if (trigger.type === 'device_state' && trigger.device?.deviceId) {
        const device = await Device.findOne({
          _id: trigger.device.deviceId,
          owner: userId,
        });
        if (!device) {
          throw new AppError(`Device not found: ${trigger.device.deviceId}`, 400);
        }
      }
    }

    // Validate device and group references in actions
    for (const action of ruleData.actions || []) {
      if (action.type === 'device_control' && action.device?.deviceId) {
        const device = await Device.findOne({
          _id: action.device.deviceId,
          owner: userId,
        });
        if (!device) {
          throw new AppError(`Device not found: ${action.device.deviceId}`, 400);
        }
      }

      if (action.type === 'group_control' && action.group?.groupId) {
        const group = await Group.findOne({
          _id: action.group.groupId,
          owner: userId,
        });
        if (!group) {
          throw new AppError(`Group not found: ${action.group.groupId}`, 400);
        }
      }

      if (action.type === 'mode_activation' && action.mode?.modeId) {
        const mode = await Mode.findOne({
          _id: action.mode.modeId,
          owner: userId,
        });
        if (!mode) {
          throw new AppError(`Mode not found: ${action.mode.modeId}`, 400);
        }
      }
    }
  }

  /**
   * Private method to setup rule triggers
   * @param {Object} rule - Rule object
   * @private
   */
  async _setupRuleTriggers(rule) {
    // Here you would implement actual trigger setup
    // For example, setting up cron jobs for time triggers,
    // event listeners for device state changes, etc.
    
    this.activeRules.set(rule._id.toString(), {
      rule,
      triggers: rule.triggers.filter(t => t.isEnabled),
    });

    logger.debug('Rule triggers setup', {
      ruleId: rule._id,
      triggersCount: rule.triggers?.filter(t => t.isEnabled).length || 0,
    });
  }

  /**
   * Private method to remove rule triggers
   * @param {string} ruleId - Rule ID
   * @private
   */
  _removRuleTriggers(ruleId) {
    this.activeRules.delete(ruleId);
    logger.debug('Rule triggers removed', { ruleId });
  }

  /**
   * Private method to check rule cooldown
   * @param {Object} rule - Rule object
   * @private
   */
  _checkCooldown(rule) {
    if (!rule.settings?.cooldownPeriod || rule.settings.cooldownPeriod === 0) {
      return true;
    }

    const lastExecution = this.ruleExecutionHistory.get(rule._id.toString());
    if (!lastExecution) {
      return true;
    }

    const cooldownMs = rule.settings.cooldownPeriod * 1000;
    return (Date.now() - lastExecution) >= cooldownMs;
  }

  /**
   * Private method to check execution limit
   * @param {Object} rule - Rule object
   * @private
   */
  _checkExecutionLimit(rule) {
    if (!rule.settings?.maxExecutions?.enabled) {
      return true;
    }

    // Implementation would depend on the period type
    // This is a simplified version
    return rule.statistics.executionCount < rule.settings.maxExecutions.count;
  }

  /**
   * Private method to evaluate rule conditions
   * @param {Object} rule - Rule object
   * @param {Object} context - Execution context
   * @private
   */
  async _evaluateConditions(rule, context) {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true;
    }

    const logic = rule.settings?.conditionLogic || 'all';
    const results = [];

    for (const condition of rule.conditions) {
      if (!condition.isEnabled) continue;

      const result = await this._evaluateCondition(condition, context);
      results.push(result);
    }

    return logic === 'all' ? results.every(r => r) : results.some(r => r);
  }

  /**
   * Private method to evaluate a single condition
   * @param {Object} condition - Condition object
   * @param {Object} context - Execution context
   * @private
   */
  async _evaluateCondition(condition, context) {
    // This is a simplified implementation
    // You would implement specific logic for each condition type
    
    switch (condition.type) {
      case 'device_state':
        return await this._evaluateDeviceStateCondition(condition);
      case 'time_range':
        return this._evaluateTimeRangeCondition(condition);
      case 'day_of_week':
        return this._evaluateDayOfWeekCondition(condition);
      default:
        logger.warn('Unknown condition type', { type: condition.type });
        return false;
    }
  }

  /**
   * Private method to execute rule actions
   * @param {Object} rule - Rule object
   * @param {Object} context - Execution context
   * @private
   */
  async _executeRuleActions(rule, context) {
    const results = {
      success: [],
      failed: [],
    };

    // Sort actions by order
    const sortedActions = [...(rule.actions || [])].sort((a, b) => (a.order || 1) - (b.order || 1));

    for (const action of sortedActions) {
      if (!action.isEnabled) continue;

      try {
        await this._executeRuleAction(action, rule.owner, context);
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
          break;
        }
      }
    }

    return results;
  }

  /**
   * Private method to execute a single rule action
   * @param {Object} action - Action object
   * @param {string} userId - User ID
   * @param {Object} context - Execution context
   * @private
   */
  async _executeRuleAction(action, userId, context) {
    switch (action.type) {
      case 'device_control':
        await deviceService.controlDevice(
          action.device.deviceId,
          action.device.action,
          action.device.settings || {},
          userId
        );
        break;
      
      case 'group_control':
        await groupService.controlGroup(
          action.group.groupId,
          {
            action: action.group.action,
            target: action.group.target,
            deviceIds: action.group.deviceIds,
            randomCount: action.group.randomCount,
            settings: action.group.settings,
          },
          userId
        );
        break;
      
      case 'mode_activation':
        switch (action.mode.action) {
          case 'activate':
            await modeService.activateMode(action.mode.modeId, { duration: action.mode.duration }, userId);
            break;
          case 'deactivate':
            await modeService.deactivateMode(action.mode.modeId, userId);
            break;
          case 'toggle':
            await modeService.toggleMode(action.mode.modeId, userId);
            break;
        }
        break;
      
      case 'delay':
        const delayMs = action.delay.unit === 'hours' ? action.delay.duration * 3600000 :
                       action.delay.unit === 'minutes' ? action.delay.duration * 60000 :
                       action.delay.duration * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        break;
      
      default:
        logger.warn('Unknown action type in rule execution', { type: action.type });
    }
  }

  /**
   * Private method to update execution tracking
   * @param {Object} rule - Rule object
   * @private
   */
  _updateExecutionTracking(rule) {
    this.ruleExecutionHistory.set(rule._id.toString(), Date.now());
  }

  /**
   * Private method to evaluate device state trigger
   * @param {Object} trigger - Trigger object
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @private
   */
  async _evaluateDeviceStateTrigger(trigger, oldState, newState) {
    const { property, operator, value, secondValue } = trigger.device;
    
    const oldValue = this._getNestedProperty(oldState, property);
    const newValue = this._getNestedProperty(newState, property);

    switch (operator) {
      case 'changes':
        return oldValue !== newValue;
      case 'changes_to':
        return newValue === value;
      case 'changes_from':
        return oldValue === value;
      case 'equals':
        return newValue === value;
      case 'not_equals':
        return newValue !== value;
      case 'greater_than':
        return newValue > value;
      case 'less_than':
        return newValue < value;
      case 'between':
        return newValue >= value && newValue <= secondValue;
      default:
        return false;
    }
  }

  /**
   * Private method to evaluate device state condition
   * @param {Object} condition - Condition object
   * @private
   */
  async _evaluateDeviceStateCondition(condition) {
    const device = await Device.findById(condition.device.deviceId);
    if (!device) return false;

    const currentValue = this._getNestedProperty(device, condition.device.property);
    const { operator, value, secondValue } = condition.device;

    switch (operator) {
      case 'equals':
        return currentValue === value;
      case 'not_equals':
        return currentValue !== value;
      case 'greater_than':
        return currentValue > value;
      case 'less_than':
        return currentValue < value;
      case 'between':
        return currentValue >= value && currentValue <= secondValue;
      default:
        return false;
    }
  }

  /**
   * Private method to evaluate time range condition
   * @param {Object} condition - Condition object
   * @private
   */
  _evaluateTimeRangeCondition(condition) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = condition.timeRange.start.split(':').map(Number);
    const [endHour, endMin] = condition.timeRange.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Crosses midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Private method to evaluate day of week condition
   * @param {Object} condition - Condition object
   * @private
   */
  _evaluateDayOfWeekCondition(condition) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[new Date().getDay()];
    return condition.dayOfWeek.includes(today);
  }

  /**
   * Private method to get nested property from object
   * @param {Object} obj - Object to get property from
   * @param {string} property - Property path (e.g., 'settings.brightness')
   * @private
   */
  _getNestedProperty(obj, property) {
    return property.split('.').reduce((o, p) => o && o[p], obj);
  }
}

export default new RuleService();
