import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

/**
 * Database connection management
 * Handles MongoDB connection with proper error handling and logging
 */
class Database {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   * @returns {Promise<mongoose.Connection>}
   */
  async connect() {
    try {
      // Prevent multiple connections
      if (this.isConnected) {
        logger.info('Database already connected');
        return this.connection;
      }

      // Connection event handlers
      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        logger.info('MongoDB connected successfully');
      });

      mongoose.connection.on('error', (error) => {
        this.isConnected = false;
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        logger.warn('MongoDB disconnected');
      });

      // Handle process termination
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      // Connect to MongoDB
      this.connection = await mongoose.connect(config.database.uri, config.database.options);
      
      logger.info(`Connected to MongoDB: ${config.database.uri}`);
      return this.connection;
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        this.isConnected = false;
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Health check for database
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return {
          status: 'disconnected',
          message: 'Database not connected',
          timestamp: new Date().toISOString(),
        };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        readyState: mongoose.connection.readyState,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Database health check failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create singleton instance
const database = new Database();

export default database;
