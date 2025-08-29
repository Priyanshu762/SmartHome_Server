import logger from '../utils/logger.js';
import nodemailer from 'nodemailer';
import Device from '../models/Device.js';
import User from '../models/User.js';

/**
 * Notification Service
 * Handles all types of notifications: email, push, in-app, SMS
 * Manages notification preferences, templates, and delivery tracking
 */
class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.notificationQueue = [];
    this.templates = new Map();
    this.deliveryTracking = new Map();
    
    this._initializeEmailTransporter();
    this._loadNotificationTemplates();
  }

  /**
   * Send notification to user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   * @returns {Object} - Delivery result
   */
  async sendNotification(userId, notification) {
    try {
      const { type, title, message, priority = 'normal', channels = ['in-app'], data = {} } = notification;

      // Get user notification preferences
      const user = await User.findById(userId).select('notificationPreferences email');
      if (!user) {
        throw new Error('User not found');
      }

      const preferences = user.notificationPreferences || {};
      
      // Filter channels based on user preferences
      const enabledChannels = channels.filter(channel => {
        return preferences[channel]?.enabled !== false;
      });

      if (enabledChannels.length === 0) {
        logger.debug('No enabled notification channels for user', { userId, type });
        return { sent: false, reason: 'No enabled channels' };
      }

      // Create notification record
      const notificationRecord = {
        id: this._generateNotificationId(),
        userId,
        type,
        title,
        message,
        priority,
        channels: enabledChannels,
        data,
        status: 'pending',
        createdAt: new Date(),
        attempts: 0,
        deliveryResults: {},
      };

      // Add to queue
      this.notificationQueue.push(notificationRecord);

      // Process notification
      const deliveryResults = await this._processNotification(notificationRecord, user);

      // Update notification record
      notificationRecord.status = deliveryResults.success ? 'delivered' : 'failed';
      notificationRecord.deliveryResults = deliveryResults;
      notificationRecord.deliveredAt = deliveryResults.success ? new Date() : null;

      // Store delivery tracking
      this.deliveryTracking.set(notificationRecord.id, notificationRecord);

      logger.info('Notification processed', {
        notificationId: notificationRecord.id,
        userId,
        type,
        success: deliveryResults.success,
        channels: enabledChannels,
      });

      return {
        notificationId: notificationRecord.id,
        sent: deliveryResults.success,
        channels: enabledChannels,
        deliveryResults,
      };
    } catch (error) {
      logger.error('Send notification failed', {
        error: error.message,
        userId,
        notificationType: notification.type,
      });
      throw error;
    }
  }

  /**
   * Send device alert notification
   * @param {string} userId - User ID
   * @param {string} deviceId - Device ID
   * @param {Object} alert - Alert data
   * @returns {Object} - Notification result
   */
  async sendDeviceAlert(userId, deviceId, alert) {
    try {
      const device = await Device.findById(deviceId);
      if (!device) {
        throw new Error('Device not found');
      }

      const { type, severity, message, details = {} } = alert;

      // Determine notification priority based on severity
      let priority = 'normal';
      let channels = ['in-app'];

      switch (severity) {
        case 'critical':
          priority = 'high';
          channels = ['in-app', 'email', 'push'];
          break;
        case 'warning':
          priority = 'normal';
          channels = ['in-app', 'push'];
          break;
        case 'info':
          priority = 'low';
          channels = ['in-app'];
          break;
      }

      const notification = {
        type: 'device_alert',
        title: `Device Alert: ${device.name}`,
        message: message || `${device.name} requires attention`,
        priority,
        channels,
        data: {
          deviceId,
          deviceName: device.name,
          deviceType: device.type,
          alertType: type,
          severity,
          details,
          timestamp: new Date(),
        },
      };

      return await this.sendNotification(userId, notification);
    } catch (error) {
      logger.error('Send device alert failed', {
        error: error.message,
        userId,
        deviceId,
        alertType: alert.type,
      });
      throw error;
    }
  }

  /**
   * Send automation notification
   * @param {string} userId - User ID
   * @param {Object} automation - Automation data
   * @param {string} event - Event type (triggered, completed, failed)
   * @returns {Object} - Notification result
   */
  async sendAutomationNotification(userId, automation, event) {
    try {
      const { type, name, id } = automation;

      let title, message, priority = 'normal';

      switch (event) {
        case 'triggered':
          title = `Automation Triggered`;
          message = `${name} has been activated`;
          priority = 'low';
          break;
        case 'completed':
          title = `Automation Completed`;
          message = `${name} completed successfully`;
          priority = 'low';
          break;
        case 'failed':
          title = `Automation Failed`;
          message = `${name} failed to execute`;
          priority = 'normal';
          break;
        default:
          title = `Automation Update`;
          message = `${name} - ${event}`;
      }

      const notification = {
        type: 'automation',
        title,
        message,
        priority,
        channels: ['in-app'],
        data: {
          automationType: type,
          automationId: id,
          automationName: name,
          event,
          timestamp: new Date(),
        },
      };

      return await this.sendNotification(userId, notification);
    } catch (error) {
      logger.error('Send automation notification failed', {
        error: error.message,
        userId,
        automationId: automation.id,
        event,
      });
      throw error;
    }
  }

  /**
   * Send security notification
   * @param {string} userId - User ID
   * @param {Object} securityEvent - Security event data
   * @returns {Object} - Notification result
   */
  async sendSecurityNotification(userId, securityEvent) {
    try {
      const { type, severity, location, details = {} } = securityEvent;

      const notification = {
        type: 'security',
        title: `Security Alert`,
        message: `${type} detected${location ? ` at ${location}` : ''}`,
        priority: severity === 'critical' ? 'high' : 'normal',
        channels: severity === 'critical' ? ['in-app', 'email', 'push', 'sms'] : ['in-app', 'push'],
        data: {
          securityEventType: type,
          severity,
          location,
          details,
          timestamp: new Date(),
        },
      };

      return await this.sendNotification(userId, notification);
    } catch (error) {
      logger.error('Send security notification failed', {
        error: error.message,
        userId,
        securityEventType: securityEvent.type,
      });
      throw error;
    }
  }

  /**
   * Send system notification
   * @param {string} userId - User ID
   * @param {Object} systemEvent - System event data
   * @returns {Object} - Notification result
   */
  async sendSystemNotification(userId, systemEvent) {
    try {
      const { type, message, severity = 'info', data = {} } = systemEvent;

      const notification = {
        type: 'system',
        title: 'System Notification',
        message,
        priority: severity === 'critical' ? 'high' : 'normal',
        channels: ['in-app'],
        data: {
          systemEventType: type,
          severity,
          ...data,
          timestamp: new Date(),
        },
      };

      return await this.sendNotification(userId, notification);
    } catch (error) {
      logger.error('Send system notification failed', {
        error: error.message,
        userId,
        systemEventType: systemEvent.type,
      });
      throw error;
    }
  }

  /**
   * Send welcome notification to new user
   * @param {string} userId - User ID
   * @returns {Object} - Notification result
   */
  async sendWelcomeNotification(userId) {
    try {
      const notification = {
        type: 'welcome',
        title: 'Welcome to Smart Home Platform!',
        message: 'Get started by adding your first device and creating your first automation.',
        priority: 'normal',
        channels: ['in-app', 'email'],
        data: {
          isWelcome: true,
          timestamp: new Date(),
        },
      };

      return await this.sendNotification(userId, notification);
    } catch (error) {
      logger.error('Send welcome notification failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} - User notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        type = null,
        unread = null,
        priority = null,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      // Filter notifications for this user
      let notifications = Array.from(this.deliveryTracking.values())
        .filter(n => n.userId === userId);

      // Apply filters
      if (type) {
        notifications = notifications.filter(n => n.type === type);
      }

      if (unread !== null) {
        notifications = notifications.filter(n => 
          unread ? !n.readAt : !!n.readAt
        );
      }

      if (priority) {
        notifications = notifications.filter(n => n.priority === priority);
      }

      // Sort notifications
      notifications.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (sortOrder === 'desc') {
          return new Date(bValue) - new Date(aValue);
        } else {
          return new Date(aValue) - new Date(bValue);
        }
      });

      // Paginate
      const skip = (page - 1) * limit;
      const paginatedNotifications = notifications.slice(skip, skip + limit);

      const result = {
        notifications: paginatedNotifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          priority: n.priority,
          status: n.status,
          data: n.data,
          createdAt: n.createdAt,
          readAt: n.readAt || null,
          deliveredAt: n.deliveredAt || null,
        })),
        pagination: {
          page,
          limit,
          total: notifications.length,
          pages: Math.ceil(notifications.length / limit),
        },
        summary: {
          total: notifications.length,
          unread: notifications.filter(n => !n.readAt).length,
          byPriority: {
            high: notifications.filter(n => n.priority === 'high').length,
            normal: notifications.filter(n => n.priority === 'normal').length,
            low: notifications.filter(n => n.priority === 'low').length,
          },
          byType: this._getNotificationsByType(notifications),
        },
      };

      logger.debug('User notifications retrieved', {
        userId,
        total: result.pagination.total,
        unread: result.summary.unread,
      });

      return result;
    } catch (error) {
      logger.error('Get user notifications failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {Object} - Update result
   */
  async markNotificationAsRead(userId, notificationId) {
    try {
      const notification = this.deliveryTracking.get(notificationId);
      
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.userId !== userId) {
        throw new Error('Unauthorized access to notification');
      }

      notification.readAt = new Date();
      this.deliveryTracking.set(notificationId, notification);

      logger.debug('Notification marked as read', {
        userId,
        notificationId,
      });

      return { success: true, readAt: notification.readAt };
    } catch (error) {
      logger.error('Mark notification as read failed', {
        error: error.message,
        userId,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for user
   * @param {string} userId - User ID
   * @returns {Object} - Update result
   */
  async markAllNotificationsAsRead(userId) {
    try {
      let updatedCount = 0;
      const now = new Date();

      for (const [id, notification] of this.deliveryTracking) {
        if (notification.userId === userId && !notification.readAt) {
          notification.readAt = now;
          this.deliveryTracking.set(id, notification);
          updatedCount++;
        }
      }

      logger.info('All notifications marked as read', {
        userId,
        updatedCount,
      });

      return { success: true, updatedCount };
    } catch (error) {
      logger.error('Mark all notifications as read failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Delete notification
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {Object} - Delete result
   */
  async deleteNotification(userId, notificationId) {
    try {
      const notification = this.deliveryTracking.get(notificationId);
      
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.userId !== userId) {
        throw new Error('Unauthorized access to notification');
      }

      this.deliveryTracking.delete(notificationId);

      logger.debug('Notification deleted', {
        userId,
        notificationId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Delete notification failed', {
        error: error.message,
        userId,
        notificationId,
      });
      throw error;
    }
  }

  /**
   * Update user notification preferences
   * @param {string} userId - User ID
   * @param {Object} preferences - Notification preferences
   * @returns {Object} - Update result
   */
  async updateNotificationPreferences(userId, preferences) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { notificationPreferences: preferences },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('Notification preferences updated', {
        userId,
        preferences,
      });

      return {
        success: true,
        preferences: user.notificationPreferences,
      };
    } catch (error) {
      logger.error('Update notification preferences failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get notification statistics
   * @param {string} userId - User ID
   * @returns {Object} - Notification statistics
   */
  async getNotificationStatistics(userId) {
    try {
      const userNotifications = Array.from(this.deliveryTracking.values())
        .filter(n => n.userId === userId);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

      const recent = userNotifications.filter(n => 
        new Date(n.createdAt) >= thirtyDaysAgo
      );

      const thisWeek = userNotifications.filter(n => 
        new Date(n.createdAt) >= sevenDaysAgo
      );

      const statistics = {
        total: userNotifications.length,
        unread: userNotifications.filter(n => !n.readAt).length,
        thisWeek: thisWeek.length,
        thisMonth: recent.length,
        byType: this._getNotificationsByType(userNotifications),
        byPriority: {
          high: userNotifications.filter(n => n.priority === 'high').length,
          normal: userNotifications.filter(n => n.priority === 'normal').length,
          low: userNotifications.filter(n => n.priority === 'low').length,
        },
        deliveryStats: {
          delivered: userNotifications.filter(n => n.status === 'delivered').length,
          failed: userNotifications.filter(n => n.status === 'failed').length,
          pending: userNotifications.filter(n => n.status === 'pending').length,
        },
        readRate: userNotifications.length > 0 ? 
          (userNotifications.filter(n => n.readAt).length / userNotifications.length) * 100 : 0,
      };

      logger.debug('Notification statistics retrieved', {
        userId,
        total: statistics.total,
        unread: statistics.unread,
      });

      return statistics;
    } catch (error) {
      logger.error('Get notification statistics failed', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  /**
   * Private method to initialize email transporter
   * @private
   */
  _initializeEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      logger.info('Email transporter initialized');
    } catch (error) {
      logger.error('Email transporter initialization failed', {
        error: error.message,
      });
    }
  }

  /**
   * Private method to load notification templates
   * @private
   */
  _loadNotificationTemplates() {
    // Load email templates
    this.templates.set('welcome_email', {
      subject: 'Welcome to Smart Home Platform!',
      html: `
        <h1>Welcome to Smart Home Platform!</h1>
        <p>Thank you for joining us. Get started by:</p>
        <ul>
          <li>Adding your first device</li>
          <li>Creating your first automation</li>
          <li>Exploring the dashboard</li>
        </ul>
        <p>Need help? Visit our <a href="https://yourdomain.com/support">support center</a>.</p>
      `,
    });

    this.templates.set('device_alert_email', {
      subject: 'Device Alert: {{deviceName}}',
      html: `
        <h2>Device Alert</h2>
        <p><strong>Device:</strong> {{deviceName}}</p>
        <p><strong>Type:</strong> {{alertType}}</p>
        <p><strong>Severity:</strong> {{severity}}</p>
        <p><strong>Message:</strong> {{message}}</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <p>Please check your device and take appropriate action.</p>
      `,
    });

    this.templates.set('security_alert_email', {
      subject: 'Security Alert - {{type}}',
      html: `
        <h2>Security Alert</h2>
        <p><strong>Type:</strong> {{type}}</p>
        <p><strong>Location:</strong> {{location}}</p>
        <p><strong>Severity:</strong> {{severity}}</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <p>This alert requires your immediate attention.</p>
      `,
    });

    logger.debug('Notification templates loaded');
  }

  /**
   * Private method to process notification
   * @param {Object} notification - Notification record
   * @param {Object} user - User object
   * @private
   */
  async _processNotification(notification, user) {
    const results = {
      success: false,
      channels: {},
      errors: [],
    };

    // Process each channel
    for (const channel of notification.channels) {
      try {
        let channelResult = false;

        switch (channel) {
          case 'email':
            channelResult = await this._sendEmailNotification(notification, user);
            break;
          case 'push':
            channelResult = await this._sendPushNotification(notification, user);
            break;
          case 'sms':
            channelResult = await this._sendSMSNotification(notification, user);
            break;
          case 'in-app':
            channelResult = true; // In-app notifications are stored in memory/database
            break;
          default:
            logger.warn('Unknown notification channel', { channel });
        }

        results.channels[channel] = {
          success: channelResult,
          sentAt: channelResult ? new Date() : null,
        };

        if (channelResult) {
          results.success = true;
        }
      } catch (error) {
        logger.error(`${channel} notification failed`, {
          error: error.message,
          notificationId: notification.id,
        });
        
        results.channels[channel] = {
          success: false,
          error: error.message,
        };
        results.errors.push(`${channel}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Private method to send email notification
   * @param {Object} notification - Notification record
   * @param {Object} user - User object
   * @private
   */
  async _sendEmailNotification(notification, user) {
    if (!this.emailTransporter || !user.email) {
      return false;
    }

    try {
      // Get email template
      const templateKey = `${notification.type}_email`;
      const template = this.templates.get(templateKey) || {
        subject: notification.title,
        html: `<h2>${notification.title}</h2><p>${notification.message}</p>`,
      };

      // Replace template variables
      const subject = this._replaceTemplateVariables(template.subject, notification.data);
      const html = this._replaceTemplateVariables(template.html, {
        ...notification.data,
        message: notification.message,
        title: notification.title,
      });

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@smarthome.com',
        to: user.email,
        subject,
        html,
      };

      await this.emailTransporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      logger.error('Email send failed', { error: error.message });
      return false;
    }
  }

  /**
   * Private method to send push notification
   * @param {Object} notification - Notification record
   * @param {Object} user - User object
   * @private
   */
  async _sendPushNotification(notification, user) {
    // Implement push notification logic here
    // This would integrate with services like Firebase Cloud Messaging
    logger.debug('Push notification sent', {
      userId: user._id,
      title: notification.title,
    });
    return true;
  }

  /**
   * Private method to send SMS notification
   * @param {Object} notification - Notification record
   * @param {Object} user - User object
   * @private
   */
  async _sendSMSNotification(notification, user) {
    // Implement SMS notification logic here
    // This would integrate with services like Twilio
    logger.debug('SMS notification sent', {
      userId: user._id,
      message: notification.message,
    });
    return true;
  }

  /**
   * Private method to replace template variables
   * @param {string} template - Template string
   * @param {Object} data - Data to replace
   * @private
   */
  _replaceTemplateVariables(template, data) {
    let result = template;
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }

  /**
   * Private method to generate notification ID
   * @private
   */
  _generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private method to get notifications by type
   * @param {Array} notifications - Notifications array
   * @private
   */
  _getNotificationsByType(notifications) {
    const byType = {};
    
    notifications.forEach(notification => {
      const type = notification.type;
      byType[type] = (byType[type] || 0) + 1;
    });
    
    return byType;
  }
}

export default new NotificationService();
