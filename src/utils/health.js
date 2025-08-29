import database from '../config/database.js';
import config from '../config/index.js';
import logger from './logger.js';

/**
 * Health check utilities for monitoring system status
 * Provides endpoints for checking database, external services, and system health
 */

/**
 * Check database health
 * @returns {Promise<Object>}
 */
export const checkDatabase = async () => {
  try {
    const healthCheck = await database.healthCheck();
    return {
      status: healthCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
      service: 'database',
      timestamp: healthCheck.timestamp,
      details: {
        connected: database.getConnectionStatus(),
        readyState: healthCheck.readyState,
        message: healthCheck.message,
      },
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      service: 'database',
      timestamp: new Date().toISOString(),
      details: {
        connected: false,
        error: error.message,
      },
    };
  }
};

/**
 * Check system memory usage
 * @returns {Object}
 */
export const checkMemory = () => {
  const memUsage = process.memoryUsage();
  const totalMem = process.platform === 'linux' ? 
    require('os').totalmem() : 
    memUsage.heapTotal * 4; // Estimate for other platforms
  
  const usedMem = memUsage.heapUsed;
  const memoryUsagePercent = (usedMem / totalMem) * 100;
  
  return {
    status: memoryUsagePercent > 90 ? 'unhealthy' : 'healthy',
    service: 'memory',
    timestamp: new Date().toISOString(),
    details: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    },
  };
};

/**
 * Check process uptime
 * @returns {Object}
 */
export const checkUptime = () => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  return {
    status: 'healthy',
    service: 'uptime',
    timestamp: new Date().toISOString(),
    details: {
      uptime: `${hours}h ${minutes}m ${seconds}s`,
      uptimeSeconds: uptime,
      processId: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
};

/**
 * Check external dependencies (if any)
 * @returns {Promise<Object>}
 */
export const checkExternalServices = async () => {
  const services = [];
  
  // Add checks for external services like Google OAuth, third-party APIs, etc.
  // For now, we'll just check if environment variables are set
  
  const googleOAuthStatus = config.google.clientId && config.google.clientSecret ? 
    'configured' : 'not_configured';
    
  services.push({
    name: 'Google OAuth',
    status: googleOAuthStatus === 'configured' ? 'healthy' : 'warning',
    details: { configured: googleOAuthStatus === 'configured' },
  });
  
  return {
    status: services.every(s => s.status === 'healthy') ? 'healthy' : 'warning',
    service: 'external_services',
    timestamp: new Date().toISOString(),
    details: { services },
  };
};

/**
 * Get overall system health
 * @returns {Promise<Object>}
 */
export const getSystemHealth = async () => {
  try {
    const [database, memory, uptime, external] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkMemory()),
      Promise.resolve(checkUptime()),
      checkExternalServices(),
    ]);
    
    const checks = [database, memory, uptime, external];
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    const warningChecks = checks.filter(check => check.status === 'warning');
    
    let overallStatus = 'healthy';
    if (unhealthyChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (warningChecks.length > 0) {
      overallStatus = 'warning';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env,
      checks: {
        database,
        memory,
        uptime,
        external,
      },
      summary: {
        total: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        warning: warningChecks.length,
        unhealthy: unhealthyChecks.length,
      },
    };
  } catch (error) {
    logger.error('System health check failed:', error);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: {},
      summary: {
        total: 0,
        healthy: 0,
        warning: 0,
        unhealthy: 1,
      },
    };
  }
};

/**
 * Simple health check for load balancers
 * @returns {Promise<Object>}
 */
export const getSimpleHealth = async () => {
  try {
    const dbHealth = await checkDatabase();
    const isHealthy = dbHealth.status === 'healthy';
    
    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
};

export default {
  checkDatabase,
  checkMemory,
  checkUptime,
  checkExternalServices,
  getSystemHealth,
  getSimpleHealth,
};
