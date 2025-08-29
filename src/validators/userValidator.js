import Joi from 'joi';
import { VALIDATION_PATTERNS } from '../config/constants.js';

/**
 * User validation schemas using Joi
 * Validates user-related requests and data
 */

// Common email schema
const emailSchema = Joi.string()
  .email()
  .lowercase()
  .trim()
  .max(255)
  .pattern(VALIDATION_PATTERNS.EMAIL)
  .messages({
    'string.email': 'Please provide a valid email address',
    'string.pattern.base': 'Email format is invalid',
  });

// Common password schema
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(VALIDATION_PATTERNS.PASSWORD)
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  });

// Common name schema
const nameSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .messages({
    'string.min': 'Name is required',
    'string.max': 'Name cannot exceed 100 characters',
  });

// User registration validation
export const validateUserRegistration = Joi.object({
  name: nameSchema.required(),
  email: emailSchema.required(),
  password: passwordSchema.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
    }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  timezone: Joi.string()
    .optional()
    .default('UTC'),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto').default('light'),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      push: Joi.boolean().default(true),
      sms: Joi.boolean().default(false),
    }).optional(),
    dashboard: Joi.object({
      layout: Joi.string().valid('grid', 'list').default('grid'),
      autoRefresh: Joi.boolean().default(true),
      refreshInterval: Joi.number().min(5).max(300).default(30),
    }).optional(),
  }).optional(),
});

// User login validation
export const validateUserLogin = Joi.object({
  email: emailSchema.required(),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
  rememberMe: Joi.boolean().optional().default(false),
});

// User profile update validation
export const validateUserUpdate = Joi.object({
  name: nameSchema.optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  timezone: Joi.string().optional(),
  avatar: Joi.string().uri().optional().allow(null, ''),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto'),
    notifications: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
      sms: Joi.boolean(),
    }),
    dashboard: Joi.object({
      layout: Joi.string().valid('grid', 'list'),
      autoRefresh: Joi.boolean(),
      refreshInterval: Joi.number().min(5).max(300),
    }),
  }).optional(),
  address: Joi.object({
    street: Joi.string().max(200).optional().allow(''),
    city: Joi.string().max(100).optional().allow(''),
    state: Joi.string().max(100).optional().allow(''),
    country: Joi.string().max(100).optional().allow(''),
    zipCode: Joi.string().max(20).optional().allow(''),
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().max(100).optional().allow(''),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow(''),
    email: emailSchema.optional().allow(''),
    relationship: Joi.string().max(50).optional().allow(''),
  }).optional(),
});

// Password change validation
export const validatePasswordChange = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required',
    }),
  newPassword: passwordSchema.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
    }),
});

// Password reset request validation
export const validatePasswordResetRequest = Joi.object({
  email: emailSchema.required(),
});

// Password reset validation
export const validatePasswordReset = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required',
    }),
  password: passwordSchema.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
    }),
});

// Email verification validation
export const validateEmailVerification = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required',
    }),
});

// User search validation
export const validateUserSearch = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
    }),
  role: Joi.string()
    .valid('admin', 'user', 'guest')
    .optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  sortBy: Joi.string()
    .valid('name', 'email', 'createdAt', 'lastActiveAt')
    .optional()
    .default('createdAt'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc'),
});

// Admin user creation validation
export const validateAdminUserCreate = Joi.object({
  name: nameSchema.required(),
  email: emailSchema.required(),
  password: passwordSchema.optional(), // Optional for OAuth users
  role: Joi.string()
    .valid('admin', 'user', 'guest')
    .required(),
  isActive: Joi.boolean().optional().default(true),
  isVerified: Joi.boolean().optional().default(false),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow(null, ''),
  timezone: Joi.string().optional().default('UTC'),
});

// Admin user update validation
export const validateAdminUserUpdate = Joi.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  role: Joi.string()
    .valid('admin', 'user', 'guest')
    .optional(),
  isActive: Joi.boolean().optional(),
  isVerified: Joi.boolean().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow(null, ''),
  timezone: Joi.string().optional(),
});

// Refresh token validation
export const validateRefreshToken = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required',
    }),
});

// User invitation validation
export const validateUserInvitation = Joi.object({
  email: emailSchema.required(),
  role: Joi.string()
    .valid('admin', 'user', 'guest')
    .optional()
    .default('user'),
  message: Joi.string()
    .max(500)
    .optional()
    .allow(''),
});

// User preferences validation
export const validateUserPreferences = Joi.object({
  theme: Joi.string().valid('light', 'dark', 'auto').optional(),
  notifications: Joi.object({
    email: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
  }).optional(),
  dashboard: Joi.object({
    layout: Joi.string().valid('grid', 'list').optional(),
    autoRefresh: Joi.boolean().optional(),
    refreshInterval: Joi.number().min(5).max(300).optional(),
  }).optional(),
});

// User deactivation validation
export const validateUserDeactivation = Joi.object({
  reason: Joi.string()
    .max(500)
    .optional()
    .allow(''),
  transferOwnership: Joi.boolean().optional().default(false),
  newOwnerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .when('transferOwnership', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'New owner ID is required when transferring ownership',
    }),
});

export default {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordChange,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateEmailVerification,
  validateUserSearch,
  validateAdminUserCreate,
  validateAdminUserUpdate,
  validateRefreshToken,
  validateUserInvitation,
  validateUserPreferences,
  validateUserDeactivation,
};
