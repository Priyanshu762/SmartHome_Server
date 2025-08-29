import jwt from '../helpers/jwt.js';
import { sendUnauthorized, sendForbidden } from '../helpers/response.js';
import { USER_ROLES } from '../config/constants.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Authentication middleware
 * Verifies JWT tokens and populates req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwt.extractTokenFromHeader(authHeader);

    if (!token) {
      return sendUnauthorized(res, 'Access token required');
    }

    // Verify token
    const decoded = jwt.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    
    if (!user) {
      return sendUnauthorized(res, 'User not found');
    }

    if (!user.isActive) {
      return sendUnauthorized(res, 'Account is deactivated');
    }

    if (user.isLocked) {
      return sendUnauthorized(res, 'Account is locked');
    }

    // Update last active time
    user.updateLastActive().catch(err => 
      logger.error('Failed to update last active time:', err)
    );

    // Add user to request
    req.user = user;
    req.token = token;

    logger.auth('Token authenticated', user.id, user.email, req.ip, true);
    next();
  } catch (error) {
    logger.auth('Token authentication failed', null, null, req.ip, false, error);
    
    if (error.message === 'TOKEN_EXPIRED') {
      return sendUnauthorized(res, 'Access token expired');
    } else if (error.message === 'TOKEN_INVALID') {
      return sendUnauthorized(res, 'Invalid access token');
    }
    
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Optional authentication middleware
 * Does not fail if no token is provided, but verifies if present
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = jwt.extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // Verify token if provided
    const decoded = jwt.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    
    if (user && user.isActive && !user.isLocked) {
      req.user = user;
      req.token = token;
      
      // Update last active time
      user.updateLastActive().catch(err => 
        logger.error('Failed to update last active time:', err)
      );
    }

    next();
  } catch (error) {
    // Invalid token, but don't fail the request
    logger.warn('Optional authentication failed:', error.message);
    next();
  }
};

/**
 * Authorization middleware factory
 * Creates middleware that checks user roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      logger.auth('Authorization failed', req.user.id, req.user.email, req.ip, false, 
        new Error(`Required roles: ${roles.join(', ')}, User role: ${req.user.role}`));
      return sendForbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Admin only middleware
 */
export const adminOnly = authorize(USER_ROLES.ADMIN);

/**
 * User or admin middleware
 */
export const userOrAdmin = authorize(USER_ROLES.USER, USER_ROLES.ADMIN);

/**
 * Resource ownership middleware factory
 * Checks if user owns the resource or is admin
 */
export const checkOwnership = (resourceIdParam = 'id', resourceModel = null) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return sendUnauthorized(res, 'Authentication required');
      }

      // Admin can access any resource
      if (req.user.role === USER_ROLES.ADMIN) {
        return next();
      }

      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return sendForbidden(res, 'Resource ID required');
      }

      // If resource model is provided, check ownership in database
      if (resourceModel) {
        const resource = await resourceModel.findById(resourceId);
        
        if (!resource) {
          return sendForbidden(res, 'Resource not found');
        }

        if (resource.owner && resource.owner.toString() !== req.user.id) {
          return sendForbidden(res, 'Access denied: not resource owner');
        }

        // Add resource to request for use in controller
        req.resource = resource;
      } else {
        // Simple ID comparison for user resources
        if (resourceId !== req.user.id) {
          return sendForbidden(res, 'Access denied: not resource owner');
        }
      }

      next();
    } catch (error) {
      logger.error('Ownership check failed:', error);
      return sendForbidden(res, 'Access verification failed');
    }
  };
};

/**
 * Device ownership middleware
 */
export const checkDeviceOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Admin can access any device
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    const deviceId = req.params.id || req.params.deviceId;
    
    if (!deviceId) {
      return sendForbidden(res, 'Device ID required');
    }

    const { default: Device } = await import('../models/Device.js');
    const device = await Device.findById(deviceId);
    
    if (!device) {
      return sendForbidden(res, 'Device not found');
    }

    // Check ownership or shared access
    const hasAccess = device.owner.toString() === req.user.id ||
                     device.sharedWith.some(share => 
                       share.user.toString() === req.user.id
                     );

    if (!hasAccess) {
      return sendForbidden(res, 'Access denied: no permission for this device');
    }

    // Add device to request
    req.device = device;
    next();
  } catch (error) {
    logger.error('Device ownership check failed:', error);
    return sendForbidden(res, 'Device access verification failed');
  }
};

/**
 * Group membership middleware
 */
export const checkGroupMembership = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Admin can access any group
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    const groupId = req.params.id || req.params.groupId;
    
    if (!groupId) {
      return sendForbidden(res, 'Group ID required');
    }

    const { default: Group } = await import('../models/Group.js');
    const group = await Group.findById(groupId);
    
    if (!group) {
      return sendForbidden(res, 'Group not found');
    }

    // Check ownership or membership
    const hasAccess = group.owner.toString() === req.user.id ||
                     group.members.some(member => 
                       member.user.toString() === req.user.id
                     );

    if (!hasAccess) {
      return sendForbidden(res, 'Access denied: not a group member');
    }

    // Add group to request
    req.group = group;
    next();
  } catch (error) {
    logger.error('Group membership check failed:', error);
    return sendForbidden(res, 'Group access verification failed');
  }
};

/**
 * Permission-based access middleware factory
 * Checks specific permissions for shared resources
 */
export const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendUnauthorized(res, 'Authentication required');
    }

    // Admin has all permissions
    if (req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    // Owner has all permissions
    if (req.device && req.device.owner.toString() === req.user.id) {
      return next();
    }

    if (req.group && req.group.owner.toString() === req.user.id) {
      return next();
    }

    // Check shared permissions for devices
    if (req.device) {
      const share = req.device.sharedWith.find(s => 
        s.user.toString() === req.user.id
      );
      
      if (!share || !share.permissions.includes(permission)) {
        return sendForbidden(res, `Permission '${permission}' required`);
      }
    }

    // Check member permissions for groups
    if (req.group) {
      const member = req.group.members.find(m => 
        m.user.toString() === req.user.id
      );
      
      if (!member || !member.permissions.includes(permission)) {
        return sendForbidden(res, `Permission '${permission}' required`);
      }
    }

    next();
  };
};

/**
 * Account verification middleware
 */
export const requireVerification = (req, res, next) => {
  if (!req.user) {
    return sendUnauthorized(res, 'Authentication required');
  }

  if (!req.user.isVerified) {
    return sendForbidden(res, 'Account verification required');
  }

  next();
};

/**
 * Socket authentication middleware
 */
export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      throw new Error('Authentication token required');
    }

    // Verify token (can be access token or socket token)
    let decoded;
    try {
      decoded = jwt.verifySocketToken(token);
    } catch (error) {
      // Try as access token if socket token fails
      decoded = jwt.verifyAccessToken(token);
    }

    // Get user from database
    const user = await User.findById(decoded.id).select('-password -refreshTokens');
    
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    if (user.isLocked) {
      throw new Error('Account is locked');
    }

    // Add user to socket
    socket.userId = user.id;
    socket.user = user;
    socket.userRole = user.role;

    logger.socket('Socket authenticated', user.id, socket.id);
    next();
  } catch (error) {
    logger.socket('Socket authentication failed', null, socket.id, { error: error.message });
    next(new Error('Authentication failed'));
  }
};

export default {
  authenticate,
  optionalAuthenticate,
  authorize,
  adminOnly,
  userOrAdmin,
  checkOwnership,
  checkDeviceOwnership,
  checkGroupMembership,
  checkPermission,
  requireVerification,
  socketAuth,
};
