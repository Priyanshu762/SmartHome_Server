import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ERROR_CODES } from '../config/constants.js';

/**
 * JWT helper functions for token generation, verification, and management
 * Handles both access and refresh tokens with proper error handling
 */

/**
 * Generate access token
 * @param {Object} payload - User payload
 * @returns {string} - JWT access token
 */
export const generateAccessToken = (payload) => {
  try {
    const tokenPayload = {
      id: payload.id || payload._id,
      email: payload.email,
      role: payload.role,
      type: 'access',
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'smart-home-api',
      audience: 'smart-home-client',
    });
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate refresh token
 * @param {Object} payload - User payload
 * @returns {string} - JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  try {
    const tokenPayload = {
      id: payload.id || payload._id,
      email: payload.email,
      type: 'refresh',
      tokenVersion: payload.tokenVersion || 0,
    };

    return jwt.sign(tokenPayload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'smart-home-api',
      audience: 'smart-home-client',
    });
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object
 * @returns {Object} - Token pair
 */
export const generateTokenPair = (user) => {
  try {
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.jwt.expiresIn,
    };
  } catch (error) {
    logger.error('Error generating token pair:', error);
    throw error;
  }
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {Object} - Decoded token payload
 */
export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'smart-home-api',
      audience: 'smart-home-client',
    });

    // Verify token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    logger.warn('Access token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      throw new Error(ERROR_CODES.TOKEN_EXPIRED);
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error(ERROR_CODES.TOKEN_INVALID);
    }
    
    throw new Error(ERROR_CODES.TOKEN_INVALID);
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} - Decoded token payload
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'smart-home-api',
      audience: 'smart-home-client',
    });

    // Verify token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    logger.warn('Refresh token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      throw new Error(ERROR_CODES.TOKEN_EXPIRED);
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error(ERROR_CODES.TOKEN_INVALID);
    }
    
    throw new Error(ERROR_CODES.TOKEN_INVALID);
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} - Expiration date or null
 */
export const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    logger.error('Error decoding token for expiration:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
export const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.exp) {
      return true;
    }

    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    logger.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Generate token for socket authentication
 * @param {Object} user - User object
 * @returns {string} - Socket token
 */
export const generateSocketToken = (user) => {
  try {
    const tokenPayload = {
      id: user.id || user._id,
      email: user.email,
      role: user.role,
      type: 'socket',
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: '1h', // Shorter expiration for socket tokens
      issuer: 'smart-home-api',
      audience: 'smart-home-socket',
    });
  } catch (error) {
    logger.error('Error generating socket token:', error);
    throw new Error('Failed to generate socket token');
  }
};

/**
 * Verify socket token
 * @param {string} token - Socket JWT token
 * @returns {Object} - Decoded token payload
 */
export const verifySocketToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'smart-home-api',
      audience: 'smart-home-socket',
    });

    // Verify token type
    if (decoded.type !== 'socket' && decoded.type !== 'access') {
      throw new Error('Invalid token type for socket');
    }

    return decoded;
  } catch (error) {
    logger.warn('Socket token verification failed:', error.message);
    throw new Error(ERROR_CODES.TOKEN_INVALID);
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  getTokenExpiration,
  isTokenExpired,
  decodeToken,
  generateSocketToken,
  verifySocketToken,
};
