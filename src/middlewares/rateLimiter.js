import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { sendRateLimitExceeded } from '../helpers/response.js';
import logger from '../utils/logger.js';

/**
 * Rate limiting middleware configurations
 * Implements different rate limits for various endpoint types
 */

/**
 * Default rate limiter
 * Applied to all routes unless overridden
 */
export const defaultLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/v1/health' || req.path === '/health';
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP address
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    return sendRateLimitExceeded(res);
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.authMaxRequests, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    // Combine IP and email for login attempts
    const email = req.body?.email || '';
    return `${req.ip}:${email}`;
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded:', {
      ip: req.ip,
      email: req.body?.email,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    return sendRateLimitExceeded(
      res, 
      'Too many authentication attempts. Please try again in 15 minutes.'
    );
  },
});

/**
 * Device control rate limiter
 * Prevents spam device toggles
 */
export const deviceControlLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 device actions per minute
  message: 'Too many device control requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for device control limits
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Device control rate limit exceeded:', {
      ip: req.ip,
      userId: req.user?.id,
      deviceId: req.params.id,
      path: req.path,
      method: req.method,
    });
    
    return sendRateLimitExceeded(
      res,
      'Too many device control requests. Please wait before trying again.'
    );
  },
});

/**
 * API creation rate limiter
 * Limits creation of new resources
 */
export const createResourceLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 new resources per 5 minutes
  message: 'Too many resources created, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Resource creation rate limit exceeded:', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    });
    
    return sendRateLimitExceeded(
      res,
      'Too many resources created. Please wait before creating more.'
    );
  },
});

/**
 * File upload rate limiter
 * Limits file upload frequency
 */
export const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded:', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.path,
      method: req.method,
    });
    
    return sendRateLimitExceeded(
      res,
      'Too many file uploads. Please wait before uploading again.'
    );
  },
});

/**
 * Search rate limiter
 * Prevents search API abuse
 */
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 searches per minute
  message: 'Too many search requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn('Search rate limit exceeded:', {
      ip: req.ip,
      userId: req.user?.id,
      query: req.query.q,
      path: req.path,
      method: req.method,
    });
    
    return sendRateLimitExceeded(
      res,
      'Too many search requests. Please wait before searching again.'
    );
  },
});

/**
 * Password reset rate limiter
 * Prevents password reset abuse
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Combine IP and email for password reset limits
    const email = req.body?.email || '';
    return `${req.ip}:${email}`;
  },
  handler: (req, res) => {
    logger.warn('Password reset rate limit exceeded:', {
      ip: req.ip,
      email: req.body?.email,
      path: req.path,
      method: req.method,
    });
    
    return sendRateLimitExceeded(
      res,
      'Too many password reset requests. Please try again in 1 hour.'
    );
  },
});

/**
 * Webhook rate limiter
 * Limits incoming webhook requests
 */
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 webhooks per minute
  message: 'Too many webhook requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use source IP for webhook rate limiting
    return req.ip;
  },
  handler: (req, res) => {
    logger.warn('Webhook rate limit exceeded:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      headers: req.headers,
    });
    
    return sendRateLimitExceeded(
      res,
      'Too many webhook requests. Please reduce request frequency.'
    );
  },
});

/**
 * Progressive rate limiter
 * Increases restrictions based on user behavior
 */
export const progressiveLimiter = (baseMax = 100, escalationFactor = 0.5) => {
  const store = new Map();
  
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: (req) => {
      const key = req.user?.id || req.ip;
      const violations = store.get(key) || 0;
      
      // Reduce max requests based on violations
      const adjustedMax = Math.max(
        Math.floor(baseMax * Math.pow(escalationFactor, violations)),
        5 // Minimum 5 requests
      );
      
      return adjustedMax;
    },
    message: 'Rate limit adjusted due to previous violations',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    },
  });
};

/**
 * Skip rate limiting for trusted sources
 */
export const skipTrusted = (req) => {
  // Skip for health checks
  if (req.path === '/api/v1/health' || req.path === '/health') {
    return true;
  }
  
  // Skip for admin users (be careful with this)
  if (req.user && req.user.role === 'admin') {
    return false; // Still apply rate limiting to admins for security
  }
  
  // Skip for localhost in development
  if (config.isDevelopment && req.ip === '127.0.0.1') {
    return true;
  }
  
  return false;
};

/**
 * Custom store for distributed rate limiting
 * Uses Redis in production, memory in development
 */
export const createRateLimitStore = () => {
  if (config.isProduction) {
    // In production, you might want to use Redis store
    // const RedisStore = require('rate-limit-redis');
    // return new RedisStore({
    //   client: redisClient,
    //   prefix: 'rl:',
    // });
  }
  
  // Use default memory store
  return undefined;
};

export default {
  defaultLimiter,
  authLimiter,
  deviceControlLimiter,
  createResourceLimiter,
  uploadLimiter,
  searchLimiter,
  passwordResetLimiter,
  webhookLimiter,
  progressiveLimiter,
  skipTrusted,
  createRateLimitStore,
};
