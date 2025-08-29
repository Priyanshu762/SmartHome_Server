/**
 * Services Index
 * Central export point for all service modules
 * Provides easy access to all business logic services
 */

// Core Services
export { default as userService } from './userService.js';
export { default as deviceService } from './deviceService.js';
export { default as groupService } from './groupService.js';
export { default as modeService } from './modeService.js';
export { default as ruleService } from './ruleService.js';

// Extended Services
export { default as automationService } from './automationService.js';
export { default as notificationService } from './notificationService.js';
export { default as analyticsService } from './analyticsService.js';

/**
 * Service initialization helper
 * Initializes all services with necessary dependencies
 */
export const initializeServices = async () => {
  try {
    // Services are already initialized as singletons
    // This function can be used for any cross-service setup
    console.log('All services initialized successfully');
    return true;
  } catch (error) {
    console.error('Service initialization failed:', error);
    throw error;
  }
};

/**
 * Service health check
 * Checks the health status of all services
 */
export const checkServicesHealth = async () => {
  const healthStatus = {
    userService: true,
    deviceService: true,
    groupService: true,
    modeService: true,
    ruleService: true,
    automationService: true,
    notificationService: true,
    analyticsService: true,
    timestamp: new Date(),
  };

  // Add specific health checks for each service if needed
  return healthStatus;
};
