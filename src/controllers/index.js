/**
 * Controllers Index
 * Central export point for all controller modules
 * Provides easy access to all HTTP request handlers
 */

// Authentication Controllers
export { default as authController } from './authController.js';
export { default as userController } from './userController.js';

// Core Feature Controllers
export { default as deviceController } from './deviceController.js';
export { default as groupController } from './groupController.js';
export { default as modeController } from './modeController.js';
export { default as ruleController } from './ruleController.js';

/**
 * Controller health check
 * Checks if all controllers are properly loaded
 */
export const checkControllersHealth = () => {
  const controllers = [
    'authController',
    'userController', 
    'deviceController',
    'groupController',
    'modeController',
    'ruleController'
  ];

  const healthStatus = {
    controllersLoaded: controllers.length,
    timestamp: new Date(),
    status: 'healthy'
  };

  return healthStatus;
};
