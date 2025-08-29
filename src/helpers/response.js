import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Response helper functions for standardized API responses
 * Provides consistent response format across all endpoints
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} - Response object
 */
export const sendSuccess = (res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  // Remove null data from response
  if (data === null) {
    delete response.data;
  }

  logger.debug('Sending success response', {
    statusCode,
    message,
    hasData: data !== null,
  });

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} statusCode - HTTP status code
 * @param {*} details - Additional error details
 * @returns {Object} - Response object
 */
export const sendError = (res, message = 'Internal Server Error', code = ERROR_CODES.INTERNAL_ERROR, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) => {
  const response = {
    success: false,
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
    },
  };

  // Add details if provided
  if (details) {
    response.error.details = details;
  }

  logger.warn('Sending error response', {
    statusCode,
    message,
    code,
    hasDetails: details !== null,
  });

  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array|string} errors - Validation errors
 * @returns {Object} - Response object
 */
export const sendValidationError = (res, errors) => {
  const message = 'Validation failed';
  const details = Array.isArray(errors) ? errors : [errors];

  return sendError(
    res,
    message,
    ERROR_CODES.VALIDATION_ERROR,
    HTTP_STATUS.BAD_REQUEST,
    { validation: details }
  );
};

/**
 * Send unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} - Response object
 */
export const sendUnauthorized = (res, message = 'Authentication required') => {
  return sendError(
    res,
    message,
    ERROR_CODES.UNAUTHORIZED,
    HTTP_STATUS.UNAUTHORIZED
  );
};

/**
 * Send forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} - Response object
 */
export const sendForbidden = (res, message = 'Access forbidden') => {
  return sendError(
    res,
    message,
    ERROR_CODES.FORBIDDEN,
    HTTP_STATUS.FORBIDDEN
  );
};

/**
 * Send not found response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} - Response object
 */
export const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(
    res,
    message,
    ERROR_CODES.NOT_FOUND,
    HTTP_STATUS.NOT_FOUND
  );
};

/**
 * Send conflict response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} - Response object
 */
export const sendConflict = (res, message = 'Resource already exists') => {
  return sendError(
    res,
    message,
    ERROR_CODES.ALREADY_EXISTS,
    HTTP_STATUS.CONFLICT
  );
};

/**
 * Send rate limit exceeded response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} - Response object
 */
export const sendRateLimitExceeded = (res, message = 'Rate limit exceeded') => {
  return sendError(
    res,
    message,
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    HTTP_STATUS.TOO_MANY_REQUESTS
  );
};

/**
 * Send created response
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 * @returns {Object} - Response object
 */
export const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, HTTP_STATUS.CREATED);
};

/**
 * Send no content response
 * @param {Object} res - Express response object
 * @returns {Object} - Response object
 */
export const sendNoContent = (res) => {
  logger.debug('Sending no content response');
  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} items - Paginated items
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @returns {Object} - Response object
 */
export const sendPaginated = (res, items, pagination, message = 'Data retrieved successfully') => {
  const data = {
    items,
    pagination: {
      currentPage: pagination.page || 1,
      totalPages: pagination.totalPages || 1,
      totalItems: pagination.totalItems || items.length,
      itemsPerPage: pagination.limit || items.length,
      hasNext: pagination.hasNext || false,
      hasPrev: pagination.hasPrev || false,
    },
  };

  return sendSuccess(res, data, message);
};

/**
 * Handle async route errors
 * @param {Function} fn - Async route handler
 * @returns {Function} - Express middleware
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Format validation errors from Joi
 * @param {Object} error - Joi validation error
 * @returns {Array} - Formatted validation errors
 */
export const formatJoiErrors = (error) => {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
  }));
};

/**
 * Format validation errors from express-validator
 * @param {Array} errors - Express-validator errors
 * @returns {Array} - Formatted validation errors
 */
export const formatExpressValidatorErrors = (errors) => {
  return errors.map(error => ({
    field: error.param || error.path,
    message: error.msg,
    value: error.value,
    location: error.location,
  }));
};

/**
 * Send device-specific error response
 * @param {Object} res - Express response object
 * @param {string} deviceId - Device ID
 * @param {string} message - Error message
 * @param {string} errorType - Device error type
 * @returns {Object} - Response object
 */
export const sendDeviceError = (res, deviceId, message, errorType = 'DEVICE_ERROR') => {
  return sendError(
    res,
    message,
    errorType,
    HTTP_STATUS.BAD_REQUEST,
    { deviceId }
  );
};

/**
 * Send socket response (for socket events)
 * @param {Object} socket - Socket.io socket object
 * @param {string} event - Event name
 * @param {*} data - Response data
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 */
export const sendSocketResponse = (socket, event, data = null, success = true, message = null) => {
  const response = {
    success,
    timestamp: new Date().toISOString(),
  };

  if (message) {
    response.message = message;
  }

  if (data !== null) {
    response.data = data;
  }

  if (!success && !message) {
    response.message = 'Operation failed';
  }

  logger.socket('Sending socket response', socket.userId, socket.id, { event, success });
  socket.emit(event, response);
};

export default {
  sendSuccess,
  sendError,
  sendValidationError,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendRateLimitExceeded,
  sendCreated,
  sendNoContent,
  sendPaginated,
  asyncHandler,
  formatJoiErrors,
  formatExpressValidatorErrors,
  sendDeviceError,
  sendSocketResponse,
};
