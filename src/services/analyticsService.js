import logger from '../utils/logger.js';
import Device from '../models/Device.js';
import  User  from '../models/User.js';
import Group from '../models/Group.js';
import  Mode  from '../models/Mode.js';
import  Rule  from '../models/Rule.js';

/**
 * Analytics Service
 * Handles data collection, analysis, reporting, and insights generation
 * Provides comprehensive analytics for users, devices, and system performance
 */
class AnalyticsService {
  constructor() {
    this.metricsCache = new Map();
    this.realTimeMetrics = new Map();
    this.analyticsQueue = [];
    this.sessionData = new Map();
  }

  /**
   * Track user event
   * @param {string} userId - User ID
   * @param {Object} event - Event data
   */
  async trackEvent(userId, event) {
    try {
      const { type, category, action, label, value, metadata = {} } = event;

      const eventRecord = {
        id: this._generateEventId(),
        userId,
        type,
        category,
        action,
        label,
        value,
        metadata,
        timestamp: new Date(),
        sessionId: this._getOrCreateSession(userId),
        ip: metadata.ip || null,
        userAgent: metadata.userAgent || null,
      };

      // Add to analytics queue for processing
      this.analyticsQueue.push(eventRecord);

      // Update real-time metrics
      this._updateRealTimeMetrics(eventRecord);

      // Process event immediately for critical events
      if (event.critical) {
        await this._processEvent(eventRecord);
      }

      logger.debug('Event tracked', {
        userId,
        type,
        category,
        action,
      });
    } catch (error) {
      logger.error('Track event failed', {
        error: error.message,
        userId,
        eventType: event.type,
      });
    }
  }

  /**
   * Track device usage
   * @param {string} userId - User ID
   * @param {string} deviceId - Device ID
   * @param {Object} usage - Usage data
   */
  async trackDeviceUsage(userId, deviceId, usage) {
    try {
      const { action, duration, powerConsumption, parameters = {} } = usage;

      await this.trackEvent(userId, {
        type: 'device_usage',
        category: 'device',
        action,
        label: deviceId,
        value: duration,
        metadata: {
          deviceId,
          powerConsumption,
          parameters,
          source: 'device_tracker',
        },
      });

      // Update device-specific metrics
      await this._updateDeviceMetrics(deviceId, usage);

      logger.debug('Device usage tracked', {
        userId,
        deviceId,
        action,
        duration,
      });
    } catch (error) {
      logger.error('Track device usage failed', {
        error: error.message,
        userId,
        deviceId,
      });
    }
  }

  /**
   * Track automation execution
   * @param {string} userId - User ID
   * @param {Object} automation - Automation data
   * @param {Object} execution - Execution data
   */
  async trackAutomationExecution(userId, automation, execution) {
    try {
      const { success, duration, error, triggeredBy, affectedDevices = [] } = execution;

      await this.trackEvent(userId, {
        type: 'automation_execution',
        category: 'automation',
        action: success ? 'completed' : 'failed',
        label: automation.id,
        value: duration,
        metadata: {
          automationType: automation.type,
          automationName: automation.name,
          triggeredBy,
          affectedDevices,
          error: error || null,
          source: 'automation_tracker',
        },
      });

      // Update automation metrics
      await this._updateAutomationMetrics(automation.id, execution);

      logger.debug('Automation execution tracked', {
        userId,
        automationId: automation.id,
        success,
        duration,
      });
    } catch (error) {
      logger.error('Track automation execution failed', {
        error: error.message,
        userId,
        automationId: automation.id,
      });
    }
  }

  /**
   * Get user analytics dashboard
   * @param {string} userId - User ID
   * @param {Object} options - Options for analytics
   * @returns {Object} - Analytics dashboard data
   */
  async getUserAnalytics(userId, options = {}) {
    try {
      const { timeRange = 30, includeComparisons = true } = options; // days

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (timeRange * 24 * 60 * 60 * 1000));

      // Get user events
      const userEvents = this._getUserEvents(userId, startDate, endDate);

      // Calculate metrics
      const metrics = await this._calculateUserMetrics(userId, userEvents, timeRange);

      // Get device analytics
      const deviceAnalytics = await this._getDeviceAnalytics(userId, startDate, endDate);

      // Get automation analytics
      const automationAnalytics = await this._getAutomationAnalytics(userId, startDate, endDate);

      // Get energy analytics
      const energyAnalytics = await this._getEnergyAnalytics(userId, startDate, endDate);

      // Get usage patterns
      const usagePatterns = await this._getUsagePatterns(userId, userEvents);

      // Prepare dashboard data
      const dashboard = {
        overview: {
          timeRange,
          totalEvents: userEvents.length,
          activeDevices: deviceAnalytics.activeDevices,
          automationTriggers: automationAnalytics.totalTriggers,
          energyUsage: energyAnalytics.total,
          lastActivity: metrics.lastActivity,
        },
        activity: {
          dailyActivity: metrics.dailyActivity,
          hourlyActivity: metrics.hourlyActivity,
          peakUsageHours: metrics.peakUsageHours,
          sessionDuration: metrics.averageSessionDuration,
        },
        devices: {
          mostUsed: deviceAnalytics.mostUsed,
          leastUsed: deviceAnalytics.leastUsed,
          uptime: deviceAnalytics.uptime,
          powerConsumption: deviceAnalytics.powerConsumption,
          offlineDevices: deviceAnalytics.offlineDevices,
        },
        automation: {
          successRate: automationAnalytics.successRate,
          mostTriggered: automationAnalytics.mostTriggered,
          executionTimes: automationAnalytics.executionTimes,
          failureReasons: automationAnalytics.failureReasons,
        },
        energy: {
          consumption: energyAnalytics.consumption,
          savings: energyAnalytics.savings,
          trends: energyAnalytics.trends,
          costAnalysis: energyAnalytics.costAnalysis,
        },
        patterns: {
          userBehavior: usagePatterns.userBehavior,
          deviceUsage: usagePatterns.deviceUsage,
          seasonalPatterns: usagePatterns.seasonal,
          recommendations: usagePatterns.recommendations,
        },
        performance: {
          systemResponse: metrics.systemResponse,
          reliability: metrics.reliability,
          userSatisfaction: metrics.userSatisfaction,
        },
      };

      // Add comparisons if requested
      if (includeComparisons) {
        dashboard.comparisons = await this._getComparisonData(userId, timeRange);
      }

      logger.info('User analytics dashboard generated', {
        userId,
        timeRange,
        eventsAnalyzed: userEvents.length,
      });

      return dashboard;
    } catch (error) {
      logger.error('Get user analytics failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get system analytics
   * @param {Object} options - Options for analytics
   * @returns {Object} - System analytics data
   */
  async getSystemAnalytics(options = {}) {
    try {
      const { timeRange = 30 } = options; // days

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (timeRange * 24 * 60 * 60 * 1000));

      // Get system-wide metrics
      const systemMetrics = await this._getSystemMetrics(startDate, endDate);

      // Get user metrics
      const userMetrics = await this._getUserMetrics(startDate, endDate);

      // Get device metrics
      const deviceMetrics = await this._getDeviceMetrics(startDate, endDate);

      // Get performance metrics
      const performanceMetrics = await this._getPerformanceMetrics(startDate, endDate);

      const analytics = {
        overview: {
          timeRange,
          totalUsers: userMetrics.totalUsers,
          activeUsers: userMetrics.activeUsers,
          totalDevices: deviceMetrics.totalDevices,
          onlineDevices: deviceMetrics.onlineDevices,
          totalEvents: systemMetrics.totalEvents,
        },
        users: {
          registrations: userMetrics.registrations,
          activity: userMetrics.activity,
          retention: userMetrics.retention,
          engagement: userMetrics.engagement,
        },
        devices: {
          distribution: deviceMetrics.distribution,
          usage: deviceMetrics.usage,
          reliability: deviceMetrics.reliability,
          performance: deviceMetrics.performance,
        },
        automation: {
          usage: systemMetrics.automationUsage,
          performance: systemMetrics.automationPerformance,
          trends: systemMetrics.automationTrends,
        },
        system: {
          performance: performanceMetrics,
          health: systemMetrics.health,
          uptime: systemMetrics.uptime,
          errors: systemMetrics.errors,
        },
        trends: {
          growth: systemMetrics.growthTrends,
          usage: systemMetrics.usageTrends,
          performance: systemMetrics.performanceTrends,
        },
      };

      logger.info('System analytics generated', {
        timeRange,
        totalUsers: userMetrics.totalUsers,
        activeUsers: userMetrics.activeUsers,
      });

      return analytics;
    } catch (error) {
      logger.error('Get system analytics failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate analytics report
   * @param {string} userId - User ID (optional for system reports)
   * @param {Object} reportConfig - Report configuration
   * @returns {Object} - Generated report
   */
  async generateReport(userId, reportConfig) {
    try {
      const {
        type,
        timeRange = 30,
        format = 'json',
        sections = ['overview', 'devices', 'automation', 'energy'],
        filters = {},
      } = reportConfig;

      let reportData;

      switch (type) {
        case 'user':
          if (!userId) {
            throw new Error('User ID required for user reports');
          }
          reportData = await this.getUserAnalytics(userId, { timeRange });
          break;
        case 'system':
          reportData = await this.getSystemAnalytics({ timeRange });
          break;
        case 'device':
          reportData = await this._generateDeviceReport(userId, timeRange, filters);
          break;
        case 'automation':
          reportData = await this._generateAutomationReport(userId, timeRange, filters);
          break;
        case 'energy':
          reportData = await this._generateEnergyReport(userId, timeRange, filters);
          break;
        default:
          throw new Error(`Unknown report type: ${type}`);
      }

      // Filter sections
      const filteredData = {};
      sections.forEach(section => {
        if (reportData[section]) {
          filteredData[section] = reportData[section];
        }
      });

      const report = {
        id: this._generateReportId(),
        type,
        userId: userId || null,
        timeRange,
        generatedAt: new Date(),
        format,
        sections,
        data: filteredData,
        metadata: {
          dataPoints: this._countDataPoints(filteredData),
          reportSize: JSON.stringify(filteredData).length,
          processingTime: Date.now() - Date.now(), // Would be calculated properly
        },
      };

      logger.info('Analytics report generated', {
        reportId: report.id,
        type,
        userId: userId || 'system',
        sections: sections.length,
      });

      return report;
    } catch (error) {
      logger.error('Generate report failed', {
        error: error.message,
        type: reportConfig.type,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get real-time metrics
   * @param {string} userId - User ID (optional for system metrics)
   * @returns {Object} - Real-time metrics
   */
  getRealTimeMetrics(userId = null) {
    try {
      if (userId) {
        // User-specific real-time metrics
        const userMetrics = this.realTimeMetrics.get(`user_${userId}`) || {};
        return {
          activeDevices: userMetrics.activeDevices || 0,
          currentPowerUsage: userMetrics.currentPowerUsage || 0,
          automationsTriggers: userMetrics.automationsTriggers || 0,
          onlineStatus: userMetrics.onlineStatus || false,
          lastActivity: userMetrics.lastActivity || null,
        };
      } else {
        // System-wide real-time metrics
        const systemMetrics = this.realTimeMetrics.get('system') || {};
        return {
          activeUsers: systemMetrics.activeUsers || 0,
          totalOnlineDevices: systemMetrics.totalOnlineDevices || 0,
          systemLoad: systemMetrics.systemLoad || 0,
          memoryUsage: systemMetrics.memoryUsage || 0,
          eventsPerSecond: systemMetrics.eventsPerSecond || 0,
        };
      }
    } catch (error) {
      logger.error('Get real-time metrics failed', {
        error: error.message,
        userId,
      });
      return {};
    }
  }

  /**
   * Private method to get user events
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @private
   */
  _getUserEvents(userId, startDate, endDate) {
    return this.analyticsQueue.filter(event => 
      event.userId === userId &&
      new Date(event.timestamp) >= startDate &&
      new Date(event.timestamp) <= endDate
    );
  }

  /**
   * Private method to calculate user metrics
   * @param {string} userId - User ID
   * @param {Array} events - User events
   * @param {number} timeRange - Time range in days
   * @private
   */
  async _calculateUserMetrics(userId, events, timeRange) {
    const sessions = this._calculateSessions(events);
    const dailyActivity = this._calculateDailyActivity(events, timeRange);
    const hourlyActivity = this._calculateHourlyActivity(events);

    return {
      lastActivity: events.length > 0 ? 
        Math.max(...events.map(e => new Date(e.timestamp))) : null,
      totalSessions: sessions.length,
      averageSessionDuration: sessions.length > 0 ?
        sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length : 0,
      dailyActivity,
      hourlyActivity,
      peakUsageHours: this._findPeakHours(hourlyActivity),
      systemResponse: await this._calculateSystemResponse(events),
      reliability: await this._calculateReliability(events),
      userSatisfaction: await this._calculateUserSatisfaction(events),
    };
  }

  /**
   * Private method to get device analytics
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @private
   */
  async _getDeviceAnalytics(userId, startDate, endDate) {
    const userDevices = await Device.find({ userId }).lean();
    const deviceEvents = this.analyticsQueue.filter(event =>
      event.userId === userId &&
      event.category === 'device' &&
      new Date(event.timestamp) >= startDate &&
      new Date(event.timestamp) <= endDate
    );

    const deviceUsage = {};
    deviceEvents.forEach(event => {
      const deviceId = event.metadata.deviceId;
      if (!deviceUsage[deviceId]) {
        deviceUsage[deviceId] = {
          totalUsage: 0,
          powerConsumption: 0,
          activations: 0,
        };
      }
      deviceUsage[deviceId].totalUsage += event.value || 0;
      deviceUsage[deviceId].powerConsumption += event.metadata.powerConsumption || 0;
      deviceUsage[deviceId].activations += 1;
    });

    const sortedByUsage = Object.entries(deviceUsage)
      .sort((a, b) => b[1].totalUsage - a[1].totalUsage);

    return {
      activeDevices: Object.keys(deviceUsage).length,
      mostUsed: sortedByUsage.slice(0, 5),
      leastUsed: sortedByUsage.slice(-5),
      uptime: await this._calculateDeviceUptime(userDevices),
      powerConsumption: Object.values(deviceUsage)
        .reduce((sum, d) => sum + d.powerConsumption, 0),
      offlineDevices: userDevices.filter(d => d.status !== 'online').length,
    };
  }

  /**
   * Private method to get automation analytics
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @private
   */
  async _getAutomationAnalytics(userId, startDate, endDate) {
    const automationEvents = this.analyticsQueue.filter(event =>
      event.userId === userId &&
      event.category === 'automation' &&
      new Date(event.timestamp) >= startDate &&
      new Date(event.timestamp) <= endDate
    );

    const successfulExecutions = automationEvents.filter(e => e.action === 'completed');
    const failedExecutions = automationEvents.filter(e => e.action === 'failed');

    const automationCounts = {};
    automationEvents.forEach(event => {
      const automationId = event.label;
      automationCounts[automationId] = (automationCounts[automationId] || 0) + 1;
    });

    return {
      totalTriggers: automationEvents.length,
      successRate: automationEvents.length > 0 ?
        (successfulExecutions.length / automationEvents.length) * 100 : 0,
      mostTriggered: Object.entries(automationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      executionTimes: successfulExecutions.map(e => e.value),
      failureReasons: failedExecutions.map(e => e.metadata.error),
    };
  }

  /**
   * Private method to get energy analytics
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @private
   */
  async _getEnergyAnalytics(userId, startDate, endDate) {
    // Mock energy analytics - in real implementation, this would analyze actual energy data
    return {
      total: 450.75, // kWh
      consumption: {
        daily: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          consumption: Math.random() * 20 + 10,
        })),
      },
      savings: {
        amount: 23.45,
        percentage: 8.2,
      },
      trends: 'decreasing',
      costAnalysis: {
        currentMonth: 89.50,
        previousMonth: 97.30,
        averageDaily: 2.98,
      },
    };
  }

  /**
   * Private method to get usage patterns
   * @param {string} userId - User ID
   * @param {Array} events - User events
   * @private
   */
  async _getUsagePatterns(userId, events) {
    return {
      userBehavior: {
        mostActiveHours: this._findPeakHours(this._calculateHourlyActivity(events)),
        averageSessionLength: 25, // minutes
        preferredDevices: ['lights', 'thermostat', 'security'],
      },
      deviceUsage: {
        sequential: ['alarm_off', 'coffee_maker_on', 'lights_on'],
        simultaneous: ['tv_on', 'lights_dim'],
      },
      seasonal: {
        summer: { increased: ['ac', 'fans'], decreased: ['heaters'] },
        winter: { increased: ['heaters', 'lights'], decreased: ['ac'] },
      },
      recommendations: [
        'Create morning routine automation',
        'Add energy-saving schedules',
        'Set up security mode for away times',
      ],
    };
  }

  /**
   * Private method to update real-time metrics
   * @param {Object} event - Event record
   * @private
   */
  _updateRealTimeMetrics(event) {
    // Update user-specific metrics
    const userKey = `user_${event.userId}`;
    const userMetrics = this.realTimeMetrics.get(userKey) || {};
    
    userMetrics.lastActivity = event.timestamp;
    userMetrics.onlineStatus = true;
    
    if (event.category === 'device') {
      userMetrics.activeDevices = (userMetrics.activeDevices || 0) + 1;
      if (event.metadata.powerConsumption) {
        userMetrics.currentPowerUsage = (userMetrics.currentPowerUsage || 0) + 
          event.metadata.powerConsumption;
      }
    }
    
    if (event.category === 'automation') {
      userMetrics.automationsTriggers = (userMetrics.automationsTriggers || 0) + 1;
    }
    
    this.realTimeMetrics.set(userKey, userMetrics);

    // Update system-wide metrics
    const systemMetrics = this.realTimeMetrics.get('system') || {};
    systemMetrics.eventsPerSecond = (systemMetrics.eventsPerSecond || 0) + 1;
    this.realTimeMetrics.set('system', systemMetrics);
  }

  /**
   * Private method to generate event ID
   * @private
   */
  _generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private method to generate report ID
   * @private
   */
  _generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private method to get or create session
   * @param {string} userId - User ID
   * @private
   */
  _getOrCreateSession(userId) {
    const existingSession = this.sessionData.get(userId);
    const now = new Date();
    
    // Create new session if none exists or if last activity was more than 30 minutes ago
    if (!existingSession || (now - existingSession.lastActivity) > 30 * 60 * 1000) {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionData.set(userId, {
        sessionId,
        startTime: now,
        lastActivity: now,
      });
      return sessionId;
    }
    
    // Update existing session
    existingSession.lastActivity = now;
    this.sessionData.set(userId, existingSession);
    return existingSession.sessionId;
  }

  /**
   * Private helper methods for calculations
   * @private
   */
  _calculateSessions(events) {
    // Mock session calculation
    return [{ duration: 1500000 }]; // 25 minutes
  }

  _calculateDailyActivity(events, timeRange) {
    const daily = {};
    events.forEach(event => {
      const date = new Date(event.timestamp).toDateString();
      daily[date] = (daily[date] || 0) + 1;
    });
    return daily;
  }

  _calculateHourlyActivity(events) {
    const hourly = Array(24).fill(0);
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourly[hour]++;
    });
    return hourly;
  }

  _findPeakHours(hourlyActivity) {
    return hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);
  }

  async _calculateSystemResponse(events) {
    return 250; // ms average
  }

  async _calculateReliability(events) {
    return 0.987; // 98.7% reliability
  }

  async _calculateUserSatisfaction(events) {
    return 0.92; // 92% satisfaction
  }

  async _calculateDeviceUptime(devices) {
    return 0.994; // 99.4% uptime
  }

  _countDataPoints(data) {
    return JSON.stringify(data).length / 100; // Rough estimate
  }

  // Additional private methods for system analytics would be implemented here...
  async _getSystemMetrics(startDate, endDate) { return {}; }
  async _getUserMetrics(startDate, endDate) { return { totalUsers: 100, activeUsers: 75 }; }
  async _getDeviceMetrics(startDate, endDate) { return { totalDevices: 500, onlineDevices: 485 }; }
  async _getPerformanceMetrics(startDate, endDate) { return {}; }
  async _getComparisonData(userId, timeRange) { return {}; }
  async _generateDeviceReport(userId, timeRange, filters) { return {}; }
  async _generateAutomationReport(userId, timeRange, filters) { return {}; }
  async _generateEnergyReport(userId, timeRange, filters) { return {}; }
  async _processEvent(event) { /* Process critical events */ }
  async _updateDeviceMetrics(deviceId, usage) { /* Update device metrics */ }
  async _updateAutomationMetrics(automationId, execution) { /* Update automation metrics */ }
}

export default new AnalyticsService();
