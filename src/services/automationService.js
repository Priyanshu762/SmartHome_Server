import logger from '../utils/logger.js';
import deviceService from './deviceService.js';
import groupService from './groupService.js';
import modeService from './modeService.js';
import ruleService from './ruleService.js';

/**
 * Automation Service
 * Handles complex automation scenarios, orchestrates between services,
 * manages system-wide automation logic, and coordinates smart home intelligence
 */
class AutomationService {
  constructor() {
    this.automationEngines = new Map(); // Store user-specific automation engines
    this.systemTriggers = new Map(); // Global system triggers
    this.scheduledTasks = new Map(); // Scheduled automation tasks
  }

  /**
   * Initialize automation system for a user
   * @param {string} userId - User ID
   * @returns {Object} - Initialization result
   */
  async initializeUserAutomation(userId) {
    try {
      // Get user's active rules and modes
      const activeRules = await ruleService.getUserRules(userId, { isActive: true });
      const activeModes = await modeService.getActiveModes(userId);

      // Initialize automation engine for user
      const automationEngine = {
        userId,
        activeRules: activeRules.rules || [],
        activeModes: activeModes || [],
        deviceStates: new Map(),
        lastActivity: new Date(),
        preferences: {
          energySaving: true,
          smartScheduling: true,
          adaptiveBehavior: true,
          securityMode: false,
        },
      };

      this.automationEngines.set(userId, automationEngine);

      // Setup device monitoring
      await this._setupDeviceMonitoring(userId);

      // Setup smart scheduling
      await this._setupSmartScheduling(userId);

      logger.info('User automation initialized', {
        userId,
        rulesCount: activeRules.rules?.length || 0,
        modesCount: activeModes?.length || 0,
      });

      return {
        message: 'Automation system initialized',
        activeRules: activeRules.rules?.length || 0,
        activeModes: activeModes?.length || 0,
      };
    } catch (error) {
      logger.error('User automation initialization failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Handle device state change and trigger automation
   * @param {string} userId - User ID
   * @param {string} deviceId - Device ID
   * @param {Object} oldState - Previous device state
   * @param {Object} newState - New device state
   */
  async handleDeviceStateChange(userId, deviceId, oldState, newState) {
    try {
      const automationEngine = this.automationEngines.get(userId);
      if (!automationEngine) {
        await this.initializeUserAutomation(userId);
        return;
      }

      // Update device state in automation engine
      automationEngine.deviceStates.set(deviceId, {
        ...newState,
        lastChanged: new Date(),
        previousState: oldState,
      });

      // Trigger rule evaluation
      await ruleService.handleDeviceStateChange(deviceId, oldState, newState);

      // Check for smart automation opportunities
      await this._evaluateSmartAutomation(userId, deviceId, oldState, newState);

      // Update user activity
      automationEngine.lastActivity = new Date();

      logger.debug('Device state change processed', {
        userId,
        deviceId,
        changes: this._getStateChanges(oldState, newState),
      });
    } catch (error) {
      logger.error('Handle device state change failed', {
        error: error.message,
        userId,
        deviceId,
      });
    }
  }

  /**
   * Analyze user behavior and suggest automations
   * @param {string} userId - User ID
   * @param {Object} options - Analysis options
   * @returns {Object} - Automation suggestions
   */
  async analyzeAndSuggestAutomations(userId, options = {}) {
    try {
      const { timeRange = 30, minOccurrences = 3 } = options; // days

      // Get user's device usage patterns
      const deviceStats = await deviceService.getDeviceStatistics(userId);
      const userDevices = await deviceService.getUserDevices(userId, {}, { limit: 100 });

      // Analyze patterns
      const patterns = await this._analyzeUsagePatterns(userId, userDevices.devices, timeRange);

      // Generate automation suggestions
      const suggestions = [];

      // Energy saving suggestions
      const energySuggestions = this._generateEnergySavingSuggestions(patterns, deviceStats);
      suggestions.push(...energySuggestions);

      // Convenience suggestions
      const convenienceSuggestions = this._generateConvenienceSuggestions(patterns);
      suggestions.push(...convenienceSuggestions);

      // Security suggestions
      const securitySuggestions = this._generateSecuritySuggestions(patterns);
      suggestions.push(...securitySuggestions);

      // Schedule-based suggestions
      const scheduleSuggestions = this._generateScheduleSuggestions(patterns);
      suggestions.push(...scheduleSuggestions);

      logger.info('Automation suggestions generated', {
        userId,
        suggestionsCount: suggestions.length,
        categories: [...new Set(suggestions.map(s => s.category))],
      });

      return {
        suggestions: suggestions.slice(0, 10), // Top 10 suggestions
        analysisMetrics: {
          patternsFound: patterns.length,
          devicesAnalyzed: userDevices.devices.length,
          timeRangeAnalyzed: timeRange,
        },
      };
    } catch (error) {
      logger.error('Automation analysis failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Create automation from suggestion
   * @param {string} userId - User ID
   * @param {Object} suggestion - Automation suggestion
   * @returns {Object} - Created automation
   */
  async createAutomationFromSuggestion(userId, suggestion) {
    try {
      let createdAutomation = null;

      switch (suggestion.type) {
        case 'rule':
          createdAutomation = await ruleService.createRule(suggestion.ruleData, userId);
          break;
        case 'mode':
          createdAutomation = await modeService.createMode(suggestion.modeData, userId);
          break;
        case 'schedule':
          // Create a rule with time-based triggers
          createdAutomation = await ruleService.createRule({
            ...suggestion.ruleData,
            type: 'schedule',
            category: 'convenience',
          }, userId);
          break;
        default:
          throw new Error(`Unknown suggestion type: ${suggestion.type}`);
      }

      logger.info('Automation created from suggestion', {
        userId,
        suggestionId: suggestion.id,
        automationType: suggestion.type,
        automationId: createdAutomation._id,
      });

      return createdAutomation;
    } catch (error) {
      logger.error('Create automation from suggestion failed', {
        error: error.message,
        userId,
        suggestionId: suggestion.id,
      });
      throw error;
    }
  }

  /**
   * Get automation insights and analytics
   * @param {string} userId - User ID
   * @param {Object} options - Options for insights
   * @returns {Object} - Automation insights
   */
  async getAutomationInsights(userId, options = {}) {
    try {
      const { timeRange = 30 } = options; // days

      const automationEngine = this.automationEngines.get(userId);

      // Get statistics from all services
      const [deviceStats, groupStats, modeStats, ruleStats] = await Promise.all([
        deviceService.getDeviceStatistics(userId),
        groupService.getGroupStatistics(userId),
        modeService.getModeStatistics(userId),
        ruleService.getRuleStatistics(userId),
      ]);

      // Calculate automation efficiency
      const efficiency = this._calculateAutomationEfficiency(ruleStats, modeStats);

      // Get energy insights
      const energyInsights = await this._getEnergyInsights(userId, timeRange);

      // Get usage insights
      const usageInsights = await this._getUsageInsights(userId, timeRange);

      const insights = {
        overview: {
          totalDevices: deviceStats.totalDevices,
          onlineDevices: deviceStats.onlineDevices,
          totalGroups: groupStats.totalGroups,
          totalModes: modeStats.totalModes,
          totalRules: ruleStats.totalRules,
          activeAutomations: ruleStats.activeRules + modeStats.activeModes,
        },
        performance: {
          automationEfficiency: efficiency,
          energySavings: energyInsights.savings,
          timesSaved: usageInsights.timesSaved,
          userSatisfaction: usageInsights.satisfaction,
        },
        usage: {
          mostUsedDevices: usageInsights.mostUsedDevices,
          mostTriggeredRules: usageInsights.mostTriggeredRules,
          peakUsageHours: usageInsights.peakHours,
        },
        recommendations: {
          optimizationOpportunities: efficiency.optimizationOpportunities,
          energySavingTips: energyInsights.tips,
          usabilityImprovements: usageInsights.improvements,
        },
        trends: {
          deviceUsageTrend: usageInsights.deviceUsageTrend,
          automationUsageTrend: usageInsights.automationUsageTrend,
          energyUsageTrend: energyInsights.energyUsageTrend,
        },
      };

      logger.info('Automation insights generated', {
        userId,
        timeRange,
        automationEfficiency: efficiency.score,
      });

      return insights;
    } catch (error) {
      logger.error('Get automation insights failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Optimize user's automation setup
   * @param {string} userId - User ID
   * @param {Object} options - Optimization options
   * @returns {Object} - Optimization results
   */
  async optimizeUserAutomation(userId, options = {}) {
    try {
      const { dryRun = true, categories = ['all'] } = options;

      const optimizations = [];

      // Optimize rules
      if (categories.includes('all') || categories.includes('rules')) {
        const ruleOptimizations = await this._optimizeRules(userId, dryRun);
        optimizations.push(...ruleOptimizations);
      }

      // Optimize modes
      if (categories.includes('all') || categories.includes('modes')) {
        const modeOptimizations = await this._optimizeModes(userId, dryRun);
        optimizations.push(...modeOptimizations);
      }

      // Optimize device groupings
      if (categories.includes('all') || categories.includes('groups')) {
        const groupOptimizations = await this._optimizeGroups(userId, dryRun);
        optimizations.push(...groupOptimizations);
      }

      // Optimize energy usage
      if (categories.includes('all') || categories.includes('energy')) {
        const energyOptimizations = await this._optimizeEnergyUsage(userId, dryRun);
        optimizations.push(...energyOptimizations);
      }

      const results = {
        optimizations,
        summary: {
          totalOptimizations: optimizations.length,
          estimatedEnergySavings: optimizations
            .filter(o => o.category === 'energy')
            .reduce((sum, o) => sum + (o.estimatedSavings || 0), 0),
          estimatedTimeSavings: optimizations
            .filter(o => o.category === 'convenience')
            .reduce((sum, o) => sum + (o.estimatedTimeSavings || 0), 0),
          dryRun,
        },
      };

      logger.info('Automation optimization completed', {
        userId,
        optimizationsCount: optimizations.length,
        dryRun,
      });

      return results;
    } catch (error) {
      logger.error('Automation optimization failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Handle user presence change
   * @param {string} userId - User ID
   * @param {string} status - Presence status (home, away, sleeping)
   * @param {Object} location - Location data (optional)
   */
  async handleUserPresenceChange(userId, status, location = null) {
    try {
      const automationEngine = this.automationEngines.get(userId);
      if (!automationEngine) {
        await this.initializeUserAutomation(userId);
        return;
      }

      // Update user presence
      automationEngine.presence = {
        status,
        location,
        timestamp: new Date(),
      };

      // Trigger presence-based automations
      await this._triggerPresenceAutomations(userId, status, location);

      logger.info('User presence change handled', {
        userId,
        status,
        hasLocation: !!location,
      });
    } catch (error) {
      logger.error('Handle user presence change failed', {
        error: error.message,
        userId,
        status,
      });
    }
  }

  /**
   * Private method to setup device monitoring
   * @param {string} userId - User ID
   * @private
   */
  async _setupDeviceMonitoring(userId) {
    // Setup monitoring for device state changes, energy usage, etc.
    logger.debug('Device monitoring setup for user', { userId });
  }

  /**
   * Private method to setup smart scheduling
   * @param {string} userId - User ID
   * @private
   */
  async _setupSmartScheduling(userId) {
    // Setup intelligent scheduling based on user patterns
    logger.debug('Smart scheduling setup for user', { userId });
  }

  /**
   * Private method to evaluate smart automation opportunities
   * @param {string} userId - User ID
   * @param {string} deviceId - Device ID
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @private
   */
  async _evaluateSmartAutomation(userId, deviceId, oldState, newState) {
    // Evaluate if this state change presents automation opportunities
    const changes = this._getStateChanges(oldState, newState);
    
    // Example: If lights are turned on manually at the same time every day,
    // suggest creating a schedule automation
    if (changes.includes('powerState') && newState.powerState === 'on') {
      // Check for recurring patterns
      await this._checkForRecurringPatterns(userId, deviceId, 'turn_on');
    }
  }

  /**
   * Private method to get state changes between old and new state
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   * @private
   */
  _getStateChanges(oldState, newState) {
    const changes = [];
    
    for (const key in newState) {
      if (oldState[key] !== newState[key]) {
        changes.push(key);
      }
    }
    
    return changes;
  }

  /**
   * Private method to analyze usage patterns
   * @param {string} userId - User ID
   * @param {Array} devices - User devices
   * @param {number} timeRange - Time range in days
   * @private
   */
  async _analyzeUsagePatterns(userId, devices, timeRange) {
    // This would analyze device usage history to find patterns
    // For now, return mock patterns
    return [
      {
        id: 'pattern1',
        type: 'time_based',
        description: 'Living room lights turned on every day at 7 PM',
        confidence: 0.85,
        occurrences: 25,
        devices: ['livingroom_light'],
      },
      {
        id: 'pattern2',
        type: 'sequence',
        description: 'Coffee maker turned on after alarm clock',
        confidence: 0.78,
        occurrences: 20,
        devices: ['alarm_clock', 'coffee_maker'],
      },
    ];
  }

  /**
   * Private method to generate energy saving suggestions
   * @param {Array} patterns - Usage patterns
   * @param {Object} deviceStats - Device statistics
   * @private
   */
  _generateEnergySavingSuggestions(patterns, deviceStats) {
    const suggestions = [];

    // Example: Auto-off suggestion for devices left on
    if (deviceStats.onlineDevices > deviceStats.activeDevices * 1.2) {
      suggestions.push({
        id: 'energy_auto_off',
        type: 'rule',
        category: 'energy',
        title: 'Auto-turn off idle devices',
        description: 'Automatically turn off devices that have been idle for 30 minutes',
        estimatedSavings: 15, // percentage
        priority: 'high',
        ruleData: {
          name: 'Auto-turn off idle devices',
          type: 'energy',
          category: 'energy',
          triggers: [{
            type: 'device_state',
            device: {
              property: 'lastActivity',
              operator: 'greater_than',
              value: 30 * 60 * 1000, // 30 minutes
            },
          }],
          actions: [{
            type: 'device_control',
            device: {
              action: 'turn_off',
            },
          }],
        },
      });
    }

    return suggestions;
  }

  /**
   * Private method to generate convenience suggestions
   * @param {Array} patterns - Usage patterns
   * @private
   */
  _generateConvenienceSuggestions(patterns) {
    const suggestions = [];

    patterns.forEach(pattern => {
      if (pattern.type === 'time_based' && pattern.confidence > 0.8) {
        suggestions.push({
          id: `convenience_${pattern.id}`,
          type: 'rule',
          category: 'convenience',
          title: `Automate ${pattern.description}`,
          description: `Create a schedule to automatically ${pattern.description.toLowerCase()}`,
          estimatedTimeSavings: 5, // minutes per week
          priority: 'medium',
          ruleData: {
            name: `Auto ${pattern.description}`,
            type: 'simple',
            category: 'convenience',
            triggers: [{
              type: 'time',
              time: { hour: 19, minute: 0, days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
            }],
            actions: [{
              type: 'device_control',
              device: {
                action: 'turn_on',
              },
            }],
          },
        });
      }
    });

    return suggestions;
  }

  /**
   * Private method to generate security suggestions
   * @param {Array} patterns - Usage patterns
   * @private
   */
  _generateSecuritySuggestions(patterns) {
    const suggestions = [];

    // Example: Away mode suggestion
    suggestions.push({
      id: 'security_away_mode',
      type: 'mode',
      category: 'security',
      title: 'Create Away Mode',
      description: 'Automatically secure your home when you leave',
      priority: 'high',
      modeData: {
        name: 'Away Mode',
        type: 'security',
        actions: [{
          type: 'device_control',
          target: { type: 'all_devices' },
          action: 'turn_off',
        }],
        autoActivate: {
          enabled: true,
          triggers: [{
            type: 'user_action',
            userAction: { action: 'leave_home' },
          }],
        },
      },
    });

    return suggestions;
  }

  /**
   * Private method to generate schedule suggestions
   * @param {Array} patterns - Usage patterns
   * @private
   */
  _generateScheduleSuggestions(patterns) {
    return patterns
      .filter(p => p.type === 'time_based')
      .map(pattern => ({
        id: `schedule_${pattern.id}`,
        type: 'rule',
        category: 'schedule',
        title: `Schedule for ${pattern.description}`,
        description: `Create automatic schedule based on your usage pattern`,
        priority: 'medium',
        ruleData: {
          name: `Scheduled ${pattern.description}`,
          type: 'schedule',
          category: 'convenience',
          // ... rule configuration based on pattern
        },
      }));
  }

  /**
   * Private method to calculate automation efficiency
   * @param {Object} ruleStats - Rule statistics
   * @param {Object} modeStats - Mode statistics
   * @private
   */
  _calculateAutomationEfficiency(ruleStats, modeStats) {
    const totalAutomations = ruleStats.totalRules + modeStats.totalModes;
    const activeAutomations = ruleStats.activeRules + modeStats.activeModes;
    const successRate = ruleStats.successRate || 0;

    const efficiency = {
      score: Math.round((activeAutomations / Math.max(totalAutomations, 1)) * successRate) / 100,
      activeRatio: activeAutomations / Math.max(totalAutomations, 1),
      successRate: successRate / 100,
      optimizationOpportunities: [],
    };

    // Add optimization opportunities
    if (efficiency.activeRatio < 0.7) {
      efficiency.optimizationOpportunities.push('Many inactive automations - consider enabling or removing them');
    }

    if (successRate < 80) {
      efficiency.optimizationOpportunities.push('Low success rate - review failed automations');
    }

    return efficiency;
  }

  /**
   * Private method to get energy insights
   * @param {string} userId - User ID
   * @param {number} timeRange - Time range in days
   * @private
   */
  async _getEnergyInsights(userId, timeRange) {
    // Mock energy insights - in real implementation, this would analyze actual energy data
    return {
      savings: {
        percentage: 12,
        amount: 45.67,
        currency: 'USD',
      },
      tips: [
        'Consider using sleep mode for entertainment devices',
        'Schedule heating/cooling based on occupancy',
        'Use motion sensors for automatic lighting',
      ],
      energyUsageTrend: 'decreasing',
    };
  }

  /**
   * Private method to get usage insights
   * @param {string} userId - User ID
   * @param {number} timeRange - Time range in days
   * @private
   */
  async _getUsageInsights(userId, timeRange) {
    // Mock usage insights
    return {
      timesSaved: 2.5, // hours per week
      satisfaction: 0.87, // 0-1 scale
      mostUsedDevices: ['living_room_lights', 'thermostat', 'coffee_maker'],
      mostTriggeredRules: ['evening_lights', 'morning_routine'],
      peakHours: [7, 8, 19, 20, 21],
      improvements: [
        'Add voice control for frequently used devices',
        'Create morning routine automation',
        'Set up location-based triggers',
      ],
      deviceUsageTrend: 'stable',
      automationUsageTrend: 'increasing',
    };
  }

  /**
   * Private method to optimize rules
   * @param {string} userId - User ID
   * @param {boolean} dryRun - Whether to actually apply optimizations
   * @private
   */
  async _optimizeRules(userId, dryRun) {
    // Mock rule optimizations
    return [
      {
        id: 'rule_optimization_1',
        category: 'rules',
        type: 'merge_similar',
        description: 'Merge 3 similar lighting rules into one comprehensive rule',
        estimatedTimeSavings: 10,
        applied: !dryRun,
      },
    ];
  }

  /**
   * Private method to optimize modes
   * @param {string} userId - User ID
   * @param {boolean} dryRun - Whether to actually apply optimizations
   * @private
   */
  async _optimizeModes(userId, dryRun) {
    return [];
  }

  /**
   * Private method to optimize groups
   * @param {string} userId - User ID
   * @param {boolean} dryRun - Whether to actually apply optimizations
   * @private
   */
  async _optimizeGroups(userId, dryRun) {
    return [];
  }

  /**
   * Private method to optimize energy usage
   * @param {string} userId - User ID
   * @param {boolean} dryRun - Whether to actually apply optimizations
   * @private
   */
  async _optimizeEnergyUsage(userId, dryRun) {
    return [
      {
        id: 'energy_optimization_1',
        category: 'energy',
        type: 'auto_off_schedule',
        description: 'Add auto-off schedules for high-power devices',
        estimatedSavings: 25, // percentage
        applied: !dryRun,
      },
    ];
  }

  /**
   * Private method to trigger presence-based automations
   * @param {string} userId - User ID
   * @param {string} status - Presence status
   * @param {Object} location - Location data
   * @private
   */
  async _triggerPresenceAutomations(userId, status, location) {
    // Trigger relevant modes or rules based on presence
    switch (status) {
      case 'away':
        // Activate away mode, turn off non-essential devices
        break;
      case 'home':
        // Activate home mode, welcome routine
        break;
      case 'sleeping':
        // Activate sleep mode, night settings
        break;
    }
  }

  /**
   * Private method to check for recurring patterns
   * @param {string} userId - User ID
   * @param {string} deviceId - Device ID
   * @param {string} action - Action performed
   * @private
   */
  async _checkForRecurringPatterns(userId, deviceId, action) {
    // Analyze historical data to detect patterns
    // If pattern detected, suggest automation
    logger.debug('Checking for recurring patterns', {
      userId,
      deviceId,
      action,
    });
  }
}

export default new AutomationService();
