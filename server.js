import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config();

// Import app and utilities
import app from './app.js';
import logger from './src/utils/logger.js';
import database from './src/config/database.js';
import socketServer from './src/socket/socketServer.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Server Configuration
 */
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Create HTTP Server
 */
const server = http.createServer(app);

// Store server reference in app for graceful shutdown
app.server = server;

/**
 * Initialize Socket.IO
 */
socketServer.initialize(server);

/**
 * Database Connection
 */
async function initializeDatabase() {
  try {
    await database.connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

/**
 * Server Startup
 */
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        pid: process.pid,
      });

      // Log additional startup information
      if (NODE_ENV === 'development') {
        logger.info('Development server URLs', {
          local: `http://localhost:${PORT}`,
          network: `http://0.0.0.0:${PORT}`,
          api: `http://localhost:${PORT}/api/v1`,
          health: `http://localhost:${PORT}/health`,
          docs: `http://localhost:${PORT}/docs`,
        });
      }

      // Log feature status
      logger.info('Feature status', {
        database: 'MongoDB connected',
        socketIO: 'Real-time communication enabled',
        authentication: 'JWT + Google OAuth 2.0',
        rateLimiting: 'Express rate limiter active',
        security: 'Helmet security headers enabled',
        logging: 'Winston structured logging',
        cors: 'Cross-origin requests configured',
        compression: 'Response compression enabled',
      });

      // Log memory usage
      const memUsage = process.memoryUsage();
      logger.info('Initial memory usage', {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error', {
          error: error.message,
          code: error.code,
          stack: error.stack,
        });
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

/**
 * Graceful Shutdown
 */
async function gracefulShutdown(signal) {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Set a timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000); // 30 seconds timeout

  try {
    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close Socket.IO server
        socketServer.shutdown();
        logger.info('Socket.IO server closed');

        // Close database connection
        await mongoose.connection.close();
        logger.info('Database connection closed');

        // Clear the forced shutdown timeout
        clearTimeout(forceShutdownTimeout);

        logger.info('Graceful shutdown completed');
        process.exit(0);

      } catch (error) {
        logger.error('Error during graceful shutdown', {
          error: error.message,
          stack: error.stack,
        });
        clearTimeout(forceShutdownTimeout);
        process.exit(1);
      }
    });

    // Close existing connections after a delay
    setTimeout(() => {
      logger.info('Forcing close of remaining connections');
      server.destroy?.();
    }, 10000); // 10 seconds delay

  } catch (error) {
    logger.error('Error initiating graceful shutdown', {
      error: error.message,
      stack: error.stack,
    });
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
}

/**
 * Process Event Handlers
 */

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception - Server will exit', {
    error: error.message,
    stack: error.stack,
  });
  
  // Attempt graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection - Server will exit', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
  });
  
  // Attempt graceful shutdown
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Handle process warnings
process.on('warning', (warning) => {
  logger.warn('Process warning', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
  });
});

/**
 * Development Helpers
 */
if (NODE_ENV === 'development') {
  // Log environment variables (excluding secrets)
  const envVars = Object.keys(process.env)
    .filter(key => !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('TOKEN'))
    .reduce((obj, key) => {
      obj[key] = process.env[key];
      return obj;
    }, {});

  logger.debug('Environment variables loaded', envVars);

  // Monitor memory usage in development
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    // Log warning if memory usage is high
    if (memUsageMB.heapUsed > 200) {
      logger.warn('High memory usage detected', memUsageMB);
    }
  }, 60000); // Check every minute

  // Log Socket.IO connection stats periodically
  setInterval(() => {
    const stats = socketServer.getConnectionStats();
    if (stats.totalConnections > 0) {
      logger.debug('Socket.IO connection stats', stats);
    }
  }, 300000); // Every 5 minutes
}

/**
 * Production Monitoring
 */
if (NODE_ENV === 'production') {
  // Log system metrics periodically
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    logger.info('System metrics', {
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      connections: socketServer.getConnectedUsersCount(),
    });
  }, 300000); // Every 5 minutes
}

/**
 * Start the Server
 */
logger.info('Starting Smart Home Control Platform Server', {
  version: process.env.APP_VERSION || '1.0.0',
  environment: NODE_ENV,
  port: PORT,
  nodeVersion: process.version,
  platform: process.platform,
});

// Initialize and start the server
startServer().catch((error) => {
  logger.error('Failed to start server', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

export default server;
