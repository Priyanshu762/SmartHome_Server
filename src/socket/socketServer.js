import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import { deviceService, analyticsService, notificationService } from '../services/index.js';

/**
 * Socket.IO Server
 * Handles real-time communication for dashboard updates, device status, and notifications
 */
class SocketServer {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // Map of userId -> socketId
    this.userSockets = new Map(); // Map of socketId -> user info
  }

  /**
   * Initialize Socket.IO server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        
        logger.debug('Socket authenticated', {
          socketId: socket.id,
          userId: decoded.id,
          email: decoded.email,
        });

        next();
      } catch (error) {
        logger.error('Socket authentication failed', {
          error: error.message,
          socketId: socket.id,
        });
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('Socket.IO server initialized');
  }

  /**
   * Handle new socket connection
   * @param {Object} socket - Socket instance
   */
  handleConnection(socket) {
    const userId = socket.userId;
    
    // Store user connection
    this.connectedUsers.set(userId, socket.id);
    this.userSockets.set(socket.id, {
      userId,
      email: socket.userEmail,
      connectedAt: new Date(),
    });

    logger.info('User connected', {
      socketId: socket.id,
      userId,
      email: socket.userEmail,
    });

    // Join user to personal room
    socket.join(`user_${userId}`);

    // Send initial data
    this.sendInitialData(socket, userId);

    // Register event handlers
    this.registerEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Track connection analytics
    analyticsService.trackEvent(userId, {
      type: 'websocket_connected',
      category: 'system',
      action: 'connect',
      metadata: {
        socketId: socket.id,
        userAgent: socket.handshake.headers['user-agent'],
      },
    });
  }

  /**
   * Handle socket disconnection
   * @param {Object} socket - Socket instance
   */
  handleDisconnection(socket) {
    const userId = socket.userId;
    
    this.connectedUsers.delete(userId);
    this.userSockets.delete(socket.id);

    logger.info('User disconnected', {
      socketId: socket.id,
      userId,
    });

    // Track disconnection analytics
    analyticsService.trackEvent(userId, {
      type: 'websocket_disconnected',
      category: 'system',
      action: 'disconnect',
      metadata: {
        socketId: socket.id,
      },
    });
  }

  /**
   * Send initial data to connected user
   * @param {Object} socket - Socket instance
   * @param {string} userId - User ID
   */
  async sendInitialData(socket, userId) {
    try {
      // Send user devices status
      const devices = await deviceService.getUserDevices(userId, {}, { limit: 100 });
      socket.emit('devices_status', {
        devices: devices.devices.map(device => ({
          id: device._id,
          name: device.name,
          type: device.type,
          status: device.status,
          state: device.state,
          lastUpdated: device.lastUpdated,
        })),
      });

      // Send real-time metrics
      const metrics = analyticsService.getRealTimeMetrics(userId);
      socket.emit('real_time_metrics', metrics);

      // Send unread notifications count
      const notifications = await notificationService.getUserNotifications(userId, { 
        unread: true, 
        limit: 1 
      });
      socket.emit('notifications_count', {
        unread: notifications.summary.unread,
      });

    } catch (error) {
      logger.error('Send initial data failed', {
        error: error.message,
        userId,
        socketId: socket.id,
      });
    }
  }

  /**
   * Register event handlers for socket
   * @param {Object} socket - Socket instance
   */
  registerEventHandlers(socket) {
    const userId = socket.userId;

    // Device control events
    socket.on('device_control', async (data) => {
      try {
        const { deviceId, action, parameters } = data;
        
        const result = await deviceService.controlDevice(deviceId, action, parameters, userId);
        
        // Emit result back to user
        socket.emit('device_control_result', {
          deviceId,
          action,
          success: result.success,
          result,
        });

        // Broadcast device status update to user's room
        this.broadcastToUser(userId, 'device_status_update', {
          deviceId,
          status: result.newStatus,
          state: result.newState,
          timestamp: new Date(),
        });

      } catch (error) {
        socket.emit('device_control_error', {
          deviceId: data.deviceId,
          action: data.action,
          error: error.message,
        });
      }
    });

    // Subscribe to device updates
    socket.on('subscribe_device', (data) => {
      const { deviceId } = data;
      socket.join(`device_${deviceId}`);
      
      logger.debug('User subscribed to device updates', {
        userId,
        deviceId,
        socketId: socket.id,
      });
    });

    // Unsubscribe from device updates
    socket.on('unsubscribe_device', (data) => {
      const { deviceId } = data;
      socket.leave(`device_${deviceId}`);
      
      logger.debug('User unsubscribed from device updates', {
        userId,
        deviceId,
        socketId: socket.id,
      });
    });

    // Request real-time metrics
    socket.on('request_metrics', () => {
      const metrics = analyticsService.getRealTimeMetrics(userId);
      socket.emit('real_time_metrics', metrics);
    });

    // Mark notification as read
    socket.on('mark_notification_read', async (data) => {
      try {
        const { notificationId } = data;
        await notificationService.markNotificationAsRead(userId, notificationId);
        
        socket.emit('notification_marked_read', { notificationId });
      } catch (error) {
        socket.emit('error', {
          type: 'mark_notification_read',
          message: error.message,
        });
      }
    });

    // Join automation room for updates
    socket.on('subscribe_automation', () => {
      socket.join(`automation_${userId}`);
      
      logger.debug('User subscribed to automation updates', {
        userId,
        socketId: socket.id,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        error: error.message,
        userId,
        socketId: socket.id,
      });
    });
  }

  /**
   * Broadcast message to specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  broadcastToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }

  /**
   * Broadcast device status update
   * @param {string} deviceId - Device ID
   * @param {Object} status - Device status
   */
  broadcastDeviceUpdate(deviceId, status) {
    if (this.io) {
      this.io.to(`device_${deviceId}`).emit('device_status_update', {
        deviceId,
        ...status,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Send notification to user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   */
  sendNotification(userId, notification) {
    this.broadcastToUser(userId, 'notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  /**
   * Send automation update
   * @param {string} userId - User ID
   * @param {Object} automation - Automation data
   * @param {string} event - Event type
   */
  sendAutomationUpdate(userId, automation, event) {
    this.broadcastToUser(userId, 'automation_update', {
      automation,
      event,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast system announcement
   * @param {Object} announcement - Announcement data
   */
  broadcastSystemAnnouncement(announcement) {
    if (this.io) {
      this.io.emit('system_announcement', {
        ...announcement,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get connected users count
   * @returns {number} - Number of connected users
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get user connection status
   * @param {string} userId - User ID
   * @returns {boolean} - Whether user is connected
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get connection statistics
   * @returns {Object} - Connection statistics
   */
  getConnectionStats() {
    const connections = Array.from(this.userSockets.values());
    
    return {
      totalConnections: connections.length,
      uniqueUsers: this.connectedUsers.size,
      averageConnectionTime: connections.length > 0 
        ? connections.reduce((sum, conn) => 
            sum + (Date.now() - conn.connectedAt.getTime()), 0) / connections.length
        : 0,
      connectionsByHour: this.getConnectionsByHour(connections),
    };
  }

  /**
   * Get connections grouped by hour
   * @param {Array} connections - Connections array
   * @returns {Object} - Connections by hour
   */
  getConnectionsByHour(connections) {
    const hourlyStats = {};
    
    connections.forEach(conn => {
      const hour = conn.connectedAt.getHours();
      hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
    });
    
    return hourlyStats;
  }

  /**
   * Shutdown socket server
   */
  shutdown() {
    if (this.io) {
      this.io.close();
      logger.info('Socket.IO server shutdown');
    }
  }
}

// Export singleton instance
export default new SocketServer();
