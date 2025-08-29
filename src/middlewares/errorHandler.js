import { sendError, sendValidationError } from '../helpers/response.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Global error handling middleware
 * Catches and formats all application errors
 */
export const errorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
      value: error.value,
    }));
    
    return sendValidationError(res, errors);
  }

  if (err.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId)
    return sendError(
      res,
      'Invalid resource ID format',
      ERROR_CODES.INVALID_INPUT,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (err.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(err.keyPattern)[0];
    return sendError(
      res,
      `${field} already exists`,
      ERROR_CODES.ALREADY_EXISTS,
      HTTP_STATUS.CONFLICT
    );
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(
      res,
      'Invalid token',
      ERROR_CODES.TOKEN_INVALID,
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(
      res,
      'Token expired',
      ERROR_CODES.TOKEN_EXPIRED,
      HTTP_STATUS.UNAUTHORIZED
    );
  }

  if (err.name === 'MulterError') {
    // File upload error
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    }
    
    return sendError(
      res,
      message,
      ERROR_CODES.VALIDATION_ERROR,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (err.type === 'entity.parse.failed') {
    // JSON parsing error
    return sendError(
      res,
      'Invalid JSON format',
      ERROR_CODES.INVALID_INPUT,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (err.type === 'entity.too.large') {
    // Request body too large
    return sendError(
      res,
      'Request body too large',
      ERROR_CODES.VALIDATION_ERROR,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Handle custom application errors
  if (err.isOperational) {
    return sendError(
      res,
      err.message,
      err.code || ERROR_CODES.INTERNAL_ERROR,
      err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  // Default internal server error
  const message = config.isDevelopment ? err.message : 'Internal server error';
  const details = config.isDevelopment ? { stack: err.stack } : null;

  return sendError(
    res,
    message,
    ERROR_CODES.INTERNAL_ERROR,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details
  );
};

/**
 * 404 Not Found handler
 * Handles routes that don't exist
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return sendError(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    ERROR_CODES.NOT_FOUND,
    HTTP_STATUS.NOT_FOUND
  );
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch promise rejections
 */
export const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error class
 */
export class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = ERROR_CODES.INTERNAL_ERROR, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Device-specific error class
 */
export class DeviceError extends AppError {
  constructor(deviceId, message, code = ERROR_CODES.DEVICE_ERROR) {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
    this.deviceId = deviceId;
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
    this.errors = errors;
  }
}

/**
 * Authentication error class
 */
export class AuthError extends AppError {
  constructor(message, code = ERROR_CODES.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
  }
}

/**
 * Authorization error class
 */
export class AuthzError extends AppError {
  constructor(message, code = ERROR_CODES.FORBIDDEN) {
    super(message, HTTP_STATUS.FORBIDDEN, code);
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.DATABASE_ERROR);
    this.originalError = originalError;
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends AppError {
  constructor(service, message, originalError = null) {
    super(`${service}: ${message}`, HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMIT_EXCEEDED);
  }
}

/**
 * Process unhandled rejections and exceptions
 */
export const setupProcessErrorHandlers = () => {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString(),
    });
    
    // In production, exit gracefully
    if (config.isProduction) {
      console.log('Shutting down due to unhandled promise rejection...');
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
    });
    
    console.log('Shutting down due to uncaught exception...');
    process.exit(1);
  });

  // Handle SIGTERM signal
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });

  // Handle SIGINT signal (Ctrl+C)
  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
};

export default {
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  AppError,
  DeviceError,
  ValidationError,
  AuthError,
  AuthzError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  setupProcessErrorHandlers,
};
