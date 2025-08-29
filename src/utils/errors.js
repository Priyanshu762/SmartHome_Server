/**
 * Custom Error Classes
 * Provides specific error types for different scenarios in the Smart Home platform
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication related errors
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.type = 'AUTHENTICATION_ERROR';
  }
}

/**
 * Authorization related errors
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.type = 'AUTHORIZATION_ERROR';
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', field = null, value = null) {
    super(message, 400);
    this.type = 'VALIDATION_ERROR';
    this.field = field;
    this.value = value;
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = null) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 404);
    this.type = 'NOT_FOUND_ERROR';
    this.resource = resource;
    this.resourceId = id;
  }
}

/**
 * Conflict errors (duplicate resources, etc.)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.type = 'CONFLICT_ERROR';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429);
    this.type = 'RATE_LIMIT_ERROR';
    this.retryAfter = retryAfter;
  }
}

/**
 * External service errors
 */
export class ExternalServiceError extends AppError {
  constructor(service = 'External service', message = 'Service unavailable') {
    super(`${service}: ${message}`, 502);
    this.type = 'EXTERNAL_SERVICE_ERROR';
    this.service = service;
  }
}

/**
 * Database related errors
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', operation = null) {
    super(message, 500);
    this.type = 'DATABASE_ERROR';
    this.operation = operation;
  }
}

/**
 * Device related errors
 */
export class DeviceError extends AppError {
  constructor(message = 'Device operation failed', deviceId = null) {
    super(message, 422);
    this.type = 'DEVICE_ERROR';
    this.deviceId = deviceId;
  }
}

/**
 * Device connection errors
 */
export class DeviceConnectionError extends DeviceError {
  constructor(deviceId = null, message = 'Failed to connect to device') {
    super(message, deviceId);
    this.type = 'DEVICE_CONNECTION_ERROR';
    this.statusCode = 503;
  }
}

/**
 * Device timeout errors
 */
export class DeviceTimeoutError extends DeviceError {
  constructor(deviceId = null, timeout = null) {
    const message = timeout 
      ? `Device operation timed out after ${timeout}ms`
      : 'Device operation timed out';
    super(message, deviceId);
    this.type = 'DEVICE_TIMEOUT_ERROR';
    this.timeout = timeout;
    this.statusCode = 408;
  }
}

/**
 * Automation related errors
 */
export class AutomationError extends AppError {
  constructor(message = 'Automation failed', ruleId = null) {
    super(message, 422);
    this.type = 'AUTOMATION_ERROR';
    this.ruleId = ruleId;
  }
}

/**
 * Scene execution errors
 */
export class SceneExecutionError extends AppError {
  constructor(sceneId = null, message = 'Scene execution failed') {
    super(message, 422);
    this.type = 'SCENE_EXECUTION_ERROR';
    this.sceneId = sceneId;
  }
}

/**
 * File operation errors
 */
export class FileOperationError extends AppError {
  constructor(operation = 'File operation', filename = null) {
    const message = filename 
      ? `${operation} failed for file: ${filename}`
      : `${operation} failed`;
    super(message, 500);
    this.type = 'FILE_OPERATION_ERROR';
    this.operation = operation;
    this.filename = filename;
  }
}

/**
 * Network related errors
 */
export class NetworkError extends AppError {
  constructor(message = 'Network operation failed', url = null) {
    super(message, 503);
    this.type = 'NETWORK_ERROR';
    this.url = url;
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AppError {
  constructor(setting = null, message = 'Configuration error') {
    const fullMessage = setting 
      ? `Configuration error for ${setting}: ${message}`
      : message;
    super(fullMessage, 500);
    this.type = 'CONFIGURATION_ERROR';
    this.setting = setting;
  }
}

/**
 * Third-party integration errors
 */
export class IntegrationError extends AppError {
  constructor(integration = 'Unknown', message = 'Integration failed') {
    super(`${integration} integration: ${message}`, 502);
    this.type = 'INTEGRATION_ERROR';
    this.integration = integration;
  }
}

/**
 * Error factory function to create appropriate error types
 */
export function createError(type, message, ...args) {
  switch (type.toLowerCase()) {
    case 'authentication':
      return new AuthenticationError(message);
    case 'authorization':
      return new AuthorizationError(message);
    case 'validation':
      return new ValidationError(message, ...args);
    case 'notfound':
      return new NotFoundError(message, ...args);
    case 'conflict':
      return new ConflictError(message);
    case 'ratelimit':
      return new RateLimitError(message, ...args);
    case 'device':
      return new DeviceError(message, ...args);
    case 'automation':
      return new AutomationError(message, ...args);
    case 'database':
      return new DatabaseError(message, ...args);
    case 'network':
      return new NetworkError(message, ...args);
    default:
      return new AppError(message, ...args);
  }
}

/**
 * Error handler utility functions
 */
export const ErrorUtils = {
  /**
   * Check if error is operational (expected) or programming error
   */
  isOperationalError: (error) => {
    return error instanceof AppError && error.isOperational;
  },

  /**
   * Format error for API response
   */
  formatErrorResponse: (error) => {
    const response = {
      error: true,
      message: error.message,
      type: error.type || 'UNKNOWN_ERROR',
      timestamp: error.timestamp || new Date().toISOString(),
    };

    // Add specific fields based on error type
    if (error instanceof ValidationError) {
      response.field = error.field;
      response.value = error.value;
    }

    if (error instanceof NotFoundError) {
      response.resource = error.resource;
      response.resourceId = error.resourceId;
    }

    if (error instanceof RateLimitError && error.retryAfter) {
      response.retryAfter = error.retryAfter;
    }

    if (error instanceof DeviceError) {
      response.deviceId = error.deviceId;
    }

    if (error instanceof AutomationError) {
      response.ruleId = error.ruleId;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;
    }

    return response;
  },

  /**
   * Log error with appropriate level
   */
  logError: (error, logger) => {
    const logData = {
      message: error.message,
      type: error.type || 'UNKNOWN_ERROR',
      statusCode: error.statusCode || 500,
      stack: error.stack,
      timestamp: error.timestamp || new Date().toISOString(),
    };

    if (error.statusCode >= 500) {
      logger.error('Server error', logData);
    } else if (error.statusCode >= 400) {
      logger.warn('Client error', logData);
    } else {
      logger.info('Error handled', logData);
    }
  },

  /**
   * Convert unknown errors to AppError instances
   */
  normalizeError: (error) => {
    if (error instanceof AppError) {
      return error;
    }

    // Handle MongoDB errors
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      if (error.code === 11000) {
        return new ConflictError('Duplicate resource');
      }
      return new DatabaseError(error.message, 'mongodb_operation');
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      const message = error.errors[field]?.message || 'Validation failed';
      return new ValidationError(message, field);
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return new AuthenticationError('Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
      return new AuthenticationError('Token expired');
    }

    // Handle generic errors
    return new AppError(
      error.message || 'An unexpected error occurred',
      error.statusCode || 500,
      false // Mark as non-operational since it's unexpected
    );
  },
};

/**
 * Async error wrapper for Express routes
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Devices
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  DEVICE_TIMEOUT: 'DEVICE_TIMEOUT',
  DEVICE_COMMUNICATION_ERROR: 'DEVICE_COMMUNICATION_ERROR',
  UNSUPPORTED_DEVICE_ACTION: 'UNSUPPORTED_DEVICE_ACTION',

  // Automation
  RULE_EXECUTION_FAILED: 'RULE_EXECUTION_FAILED',
  SCENE_EXECUTION_FAILED: 'SCENE_EXECUTION_FAILED',
  INVALID_AUTOMATION_CONFIG: 'INVALID_AUTOMATION_CONFIG',

  // System
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
};

export default {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  DeviceError,
  DeviceConnectionError,
  DeviceTimeoutError,
  AutomationError,
  SceneExecutionError,
  FileOperationError,
  NetworkError,
  ConfigurationError,
  IntegrationError,
  createError,
  ErrorUtils,
  asyncHandler,
  ERROR_CODES,
};
