import winston from 'winston';
import path from 'path';
import config from '../config/index.js';

/**
 * Winston logger configuration
 * Provides structured logging with different levels and formats
 */

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    format: config.isDevelopment ? consoleFormat : logFormat,
    level: config.logging.level,
  })
];

// Add file transport for production
if (config.isProduction) {
  // Ensure logs directory exists
  const logsDir = path.dirname(config.logging.file);
  
  transports.push(
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: config.logging.file,
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
  exitOnError: false,
});

// Add request logging helper
logger.request = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    logger.info('HTTP Request', {
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
    });
  });
  
  if (next) next();
};

// Add database logging helper
logger.database = (operation, collection, query = {}, duration) => {
  logger.debug('Database Operation', {
    operation,
    collection,
    query: JSON.stringify(query),
    duration: duration ? `${duration}ms` : undefined,
  });
};

// Add authentication logging helper
logger.auth = (action, userId, email, ip, success = true, error = null) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Authentication Event', {
    action,
    userId,
    email,
    ip,
    success,
    error: error?.message,
  });
};

// Add socket logging helper
logger.socket = (event, userId, socketId, data = {}) => {
  logger.debug('Socket Event', {
    event,
    userId,
    socketId,
    data: JSON.stringify(data),
  });
};

export default logger;
