import Joi from 'joi';
import { DEVICE_TYPES, DEVICE_STATUS, POWER_STATES } from '../config/constants.js';

/**
 * Device validation schemas using Joi
 * Validates device-related requests and data
 */

// MongoDB ObjectId validation
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

// IP Address validation
const ipAddressSchema = Joi.string()
  .pattern(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
  .messages({
    'string.pattern.base': 'Invalid IP address format',
  });

// MAC Address validation
const macAddressSchema = Joi.string()
  .pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
  .messages({
    'string.pattern.base': 'Invalid MAC address format',
  });

// Hex color validation
const hexColorSchema = Joi.string()
  .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  .messages({
    'string.pattern.base': 'Invalid hex color format (use #RRGGBB or #RGB)',
  });

// Time validation (HH:MM format)
const timeSchema = Joi.string()
  .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  .messages({
    'string.pattern.base': 'Invalid time format (use HH:MM)',
  });

// Device creation validation
export const validateDeviceCreate = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Device name is required',
      'string.max': 'Device name cannot exceed 100 characters',
    }),
  
  type: Joi.string()
    .valid(...Object.values(DEVICE_TYPES))
    .required()
    .messages({
      'any.only': 'Invalid device type',
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .default(''),
  
  manufacturer: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(''),
  
  model: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(''),
  
  serialNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(''),
  
  ipAddress: ipAddressSchema.optional().allow(''),
  
  macAddress: macAddressSchema.optional().allow(''),
  
  port: Joi.number()
    .integer()
    .min(1)
    .max(65535)
    .optional(),
  
  capabilities: Joi.object({
    canToggle: Joi.boolean().default(true),
    canDim: Joi.boolean().default(false),
    canChangeColor: Joi.boolean().default(false),
    canSetTemperature: Joi.boolean().default(false),
    canSetTimer: Joi.boolean().default(true),
    canRecordVideo: Joi.boolean().default(false),
    canDetectMotion: Joi.boolean().default(false),
    canMeasureEnergy: Joi.boolean().default(false),
    canSetSpeed: Joi.boolean().default(false),
    hasLock: Joi.boolean().default(false),
  }).optional(),
  
  location: Joi.object({
    room: Joi.string().max(100).optional().allow(''),
    floor: Joi.string().max(100).optional().allow(''),
    building: Joi.string().max(100).optional().allow(''),
    coordinates: Joi.object({
      x: Joi.number().optional(),
      y: Joi.number().optional(),
      z: Joi.number().optional(),
    }).optional(),
  }).optional(),
  
  groups: Joi.array()
    .items(objectIdSchema)
    .optional()
    .default([]),
  
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .optional()
    .default([]),
  
  notes: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .default(''),
});

// Device update validation
export const validateDeviceUpdate = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow(''),
  
  manufacturer: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(''),
  
  model: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(''),
  
  serialNumber: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(''),
  
  ipAddress: ipAddressSchema.optional().allow(''),
  
  macAddress: macAddressSchema.optional().allow(''),
  
  port: Joi.number()
    .integer()
    .min(1)
    .max(65535)
    .optional(),
  
  status: Joi.string()
    .valid(...Object.values(DEVICE_STATUS))
    .optional(),
  
  powerState: Joi.string()
    .valid(...Object.values(POWER_STATES))
    .optional(),
  
  isOnline: Joi.boolean().optional(),
  
  capabilities: Joi.object({
    canToggle: Joi.boolean(),
    canDim: Joi.boolean(),
    canChangeColor: Joi.boolean(),
    canSetTemperature: Joi.boolean(),
    canSetTimer: Joi.boolean(),
    canRecordVideo: Joi.boolean(),
    canDetectMotion: Joi.boolean(),
    canMeasureEnergy: Joi.boolean(),
    canSetSpeed: Joi.boolean(),
    hasLock: Joi.boolean(),
  }).optional(),
  
  settings: Joi.object({
    brightness: Joi.number().min(0).max(100).optional(),
    color: Joi.object({
      hue: Joi.number().min(0).max(360).optional(),
      saturation: Joi.number().min(0).max(100).optional(),
      value: Joi.number().min(0).max(100).optional(),
      hex: hexColorSchema.optional(),
    }).optional(),
    temperature: Joi.object({
      target: Joi.number().min(-50).max(100).optional(),
      unit: Joi.string().valid('C', 'F').optional(),
    }).optional(),
    speed: Joi.number().min(0).max(100).optional(),
    volume: Joi.number().min(0).max(100).optional(),
    mode: Joi.string().max(50).optional(),
    isLocked: Joi.boolean().optional(),
    isRecording: Joi.boolean().optional(),
  }).optional(),
  
  location: Joi.object({
    room: Joi.string().max(100).optional().allow(''),
    floor: Joi.string().max(100).optional().allow(''),
    building: Joi.string().max(100).optional().allow(''),
    coordinates: Joi.object({
      x: Joi.number().optional(),
      y: Joi.number().optional(),
      z: Joi.number().optional(),
    }).optional(),
  }).optional(),
  
  groups: Joi.array()
    .items(objectIdSchema)
    .optional(),
  
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .optional(),
  
  notes: Joi.string()
    .max(1000)
    .optional()
    .allow(''),
});

// Device settings update validation
export const validateDeviceSettings = Joi.object({
  brightness: Joi.number().min(0).max(100).optional(),
  color: Joi.object({
    hue: Joi.number().min(0).max(360).optional(),
    saturation: Joi.number().min(0).max(100).optional(),
    value: Joi.number().min(0).max(100).optional(),
    hex: hexColorSchema.optional(),
  }).optional(),
  temperature: Joi.object({
    target: Joi.number().min(-50).max(100).optional(),
    unit: Joi.string().valid('C', 'F').optional(),
  }).optional(),
  speed: Joi.number().min(0).max(100).optional(),
  volume: Joi.number().min(0).max(100).optional(),
  mode: Joi.string().max(50).optional(),
  isLocked: Joi.boolean().optional(),
  isRecording: Joi.boolean().optional(),
});

// Device timer validation
export const validateDeviceTimer = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Timer name is required',
      'string.max': 'Timer name cannot exceed 100 characters',
    }),
  
  action: Joi.string()
    .valid('turn_on', 'turn_off', 'toggle')
    .required(),
  
  scheduledTime: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.min': 'Scheduled time must be in the future',
    }),
  
  isRecurring: Joi.boolean()
    .optional()
    .default(false),
  
  recurringDays: Joi.array()
    .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
    .when('isRecurring', {
      is: true,
      then: Joi.array().min(1).required(),
      otherwise: Joi.array().optional(),
    })
    .messages({
      'array.min': 'At least one day must be selected for recurring timers',
    }),
});

// Device search validation
export const validateDeviceSearch = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
    }),
  
  type: Joi.string()
    .valid(...Object.values(DEVICE_TYPES))
    .optional(),
  
  status: Joi.string()
    .valid(...Object.values(DEVICE_STATUS))
    .optional(),
  
  powerState: Joi.string()
    .valid(...Object.values(POWER_STATES))
    .optional(),
  
  isOnline: Joi.boolean().optional(),
  
  room: Joi.string().max(100).optional(),
  
  group: objectIdSchema.optional(),
  
  tags: Joi.array()
    .items(Joi.string().max(50))
    .optional(),
  
  hasCapability: Joi.string()
    .valid('canToggle', 'canDim', 'canChangeColor', 'canSetTemperature', 'canSetTimer', 'canRecordVideo', 'canDetectMotion', 'canMeasureEnergy', 'canSetSpeed', 'hasLock')
    .optional(),
  
  page: Joi.number().integer().min(1).optional().default(1),
  
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  
  sortBy: Joi.string()
    .valid('name', 'type', 'status', 'powerState', 'createdAt', 'lastSeen')
    .optional()
    .default('name'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('asc'),
});

// Device energy update validation
export const validateDeviceEnergyUpdate = Joi.object({
  currentUsage: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.min': 'Energy usage cannot be negative',
    }),
  
  unit: Joi.string()
    .valid('W', 'kW', 'kWh', 'V', 'A')
    .optional()
    .default('W'),
});

// Device sharing validation
export const validateDeviceSharing = Joi.object({
  userId: objectIdSchema.required(),
  
  permissions: Joi.array()
    .items(Joi.string().valid('view', 'control', 'configure', 'share'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission must be granted',
    }),
});

// Device configuration validation
export const validateDeviceConfiguration = Joi.object({
  autoOff: Joi.object({
    enabled: Joi.boolean().optional(),
    duration: Joi.number().min(1).max(1440).optional(), // 1 minute to 24 hours
  }).optional(),
  
  notifications: Joi.object({
    statusChange: Joi.boolean().optional(),
    energyThreshold: Joi.object({
      enabled: Joi.boolean().optional(),
      value: Joi.number().min(0).optional(),
    }).optional(),
    maintenance: Joi.boolean().optional(),
  }).optional(),
  
  schedules: Joi.array()
    .items(Joi.object({
      name: Joi.string().trim().min(1).max(100).required(),
      isActive: Joi.boolean().default(true),
      triggers: Joi.array()
        .items(Joi.object({
          type: Joi.string().valid('time', 'sunset', 'sunrise', 'motion', 'temperature').required(),
          value: Joi.alternatives().try(
            timeSchema,
            Joi.number(),
            Joi.string()
          ).optional(),
          days: Joi.array()
            .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
            .optional(),
        }))
        .min(1)
        .required(),
      actions: Joi.array()
        .items(Joi.object({
          type: Joi.string().valid('turn_on', 'turn_off', 'set_brightness', 'set_temperature', 'set_color').required(),
          value: Joi.alternatives().try(
            Joi.number(),
            Joi.string(),
            Joi.object()
          ).optional(),
        }))
        .min(1)
        .required(),
    }))
    .optional(),
});

// Bulk device action validation
export const validateBulkDeviceAction = Joi.object({
  deviceIds: Joi.array()
    .items(objectIdSchema)
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one device must be selected',
      'array.max': 'Cannot perform bulk action on more than 50 devices',
    }),
  
  action: Joi.string()
    .valid('turn_on', 'turn_off', 'toggle', 'update_settings', 'delete')
    .required(),
  
  settings: Joi.when('action', {
    is: 'update_settings',
    then: validateDeviceSettings.required(),
    otherwise: Joi.optional(),
  }),
});

// Device status validation (for status updates from devices)
export const validateDeviceStatus = Joi.object({
  status: Joi.string()
    .valid(...Object.values(DEVICE_STATUS))
    .optional(),
  
  powerState: Joi.string()
    .valid(...Object.values(POWER_STATES))
    .optional(),
  
  isOnline: Joi.boolean().optional(),
  
  settings: validateDeviceSettings.optional(),
  
  energy: Joi.object({
    currentUsage: Joi.number().min(0).optional(),
    unit: Joi.string().valid('W', 'kW', 'kWh', 'V', 'A').optional(),
  }).optional(),
  
  timestamp: Joi.date().optional().default(() => new Date()),
});

export default {
  validateDeviceCreate,
  validateDeviceUpdate,
  validateDeviceSettings,
  validateDeviceTimer,
  validateDeviceSearch,
  validateDeviceEnergyUpdate,
  validateDeviceSharing,
  validateDeviceConfiguration,
  validateBulkDeviceAction,
  validateDeviceStatus,
};
