import Joi from 'joi';

/**
 * Group validation schemas using Joi
 * Validates group-related requests and data
 */

// MongoDB ObjectId validation
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

// Group creation validation
export const validateGroupCreate = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Group name is required',
      'string.max': 'Group name cannot exceed 100 characters',
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .default(''),
  
  type: Joi.string()
    .valid('room', 'device_type', 'custom', 'scene', 'automation')
    .optional()
    .default('custom'),
  
  color: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid hex color format (use #RRGGBB or #RGB)',
    }),
  
  icon: Joi.string()
    .max(50)
    .optional()
    .allow(''),
  
  isActive: Joi.boolean()
    .optional()
    .default(true),
  
  isDefault: Joi.boolean()
    .optional()
    .default(false),
  
  devices: Joi.array()
    .items(objectIdSchema)
    .optional()
    .default([]),
  
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .optional()
    .default([]),
  
  settings: Joi.object({
    priority: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .optional()
      .default(5),
    
    maxDevices: Joi.number()
      .integer()
      .min(1)
      .max(1000)
      .optional(),
    
    allowAutoAdd: Joi.boolean()
      .optional()
      .default(false),
    
    autoAddCriteria: Joi.object({
      deviceType: Joi.string().optional(),
      location: Joi.object({
        room: Joi.string().max(100).optional(),
        floor: Joi.string().max(100).optional(),
        building: Joi.string().max(100).optional(),
      }).optional(),
      tags: Joi.array()
        .items(Joi.string().max(50))
        .optional(),
    }).when('allowAutoAdd', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }).optional(),
  
  automation: Joi.object({
    enabled: Joi.boolean()
      .optional()
      .default(false),
    
    rules: Joi.array()
      .items(Joi.object({
        trigger: Joi.string()
          .valid('device_state_change', 'time_based', 'manual', 'sensor_threshold')
          .required(),
        
        conditions: Joi.array()
          .items(Joi.object({
            type: Joi.string()
              .valid('device_state', 'time', 'day_of_week', 'sensor_value')
              .required(),
            
            operator: Joi.string()
              .valid('equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains')
              .required(),
            
            value: Joi.alternatives()
              .try(Joi.string(), Joi.number(), Joi.boolean(), Joi.array())
              .required(),
          }))
          .optional(),
        
        actions: Joi.array()
          .items(Joi.object({
            type: Joi.string()
              .valid('turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_temperature', 'set_color', 'notification')
              .required(),
            
            target: Joi.string()
              .valid('all', 'random', 'specific')
              .optional()
              .default('all'),
            
            deviceIds: Joi.array()
              .items(objectIdSchema)
              .when('target', {
                is: 'specific',
                then: Joi.array().min(1).required(),
                otherwise: Joi.array().optional(),
              }),
            
            settings: Joi.object().optional(),
            
            delay: Joi.number()
              .integer()
              .min(0)
              .max(3600) // Max 1 hour delay
              .optional()
              .default(0),
          }))
          .min(1)
          .required(),
      }))
      .when('enabled', {
        is: true,
        then: Joi.array().min(1).required(),
        otherwise: Joi.array().optional(),
      }),
  }).optional(),
  
  permissions: Joi.object({
    isPublic: Joi.boolean()
      .optional()
      .default(false),
    
    sharedWith: Joi.array()
      .items(Joi.object({
        userId: objectIdSchema.required(),
        role: Joi.string()
          .valid('viewer', 'editor', 'admin')
          .required(),
        permissions: Joi.array()
          .items(Joi.string().valid('view', 'control', 'configure', 'share'))
          .min(1)
          .required(),
      }))
      .optional()
      .default([]),
  }).optional(),
  
  schedule: Joi.object({
    enabled: Joi.boolean()
      .optional()
      .default(false),
    
    schedules: Joi.array()
      .items(Joi.object({
        name: Joi.string()
          .trim()
          .min(1)
          .max(100)
          .required(),
        
        isActive: Joi.boolean()
          .optional()
          .default(true),
        
        trigger: Joi.object({
          type: Joi.string()
            .valid('time', 'sunrise', 'sunset')
            .required(),
          
          time: Joi.when('type', {
            is: 'time',
            then: Joi.string()
              .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required()
              .messages({
                'string.pattern.base': 'Invalid time format (use HH:MM)',
              }),
            otherwise: Joi.optional(),
          }),
          
          offset: Joi.when('type', {
            is: Joi.valid('sunrise', 'sunset'),
            then: Joi.number()
              .integer()
              .min(-120)
              .max(120)
              .optional()
              .default(0),
            otherwise: Joi.optional(),
          }),
        }).required(),
        
        days: Joi.array()
          .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
          .min(1)
          .required(),
        
        action: Joi.string()
          .valid('turn_on', 'turn_off', 'toggle', 'activate_scene')
          .required(),
        
        settings: Joi.object().optional(),
      }))
      .when('enabled', {
        is: true,
        then: Joi.array().min(1).required(),
        otherwise: Joi.array().optional(),
      }),
  }).optional(),
});

// Group update validation
export const validateGroupUpdate = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow(''),
  
  type: Joi.string()
    .valid('room', 'device_type', 'custom', 'scene', 'automation')
    .optional(),
  
  color: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid hex color format (use #RRGGBB or #RGB)',
    }),
  
  icon: Joi.string()
    .max(50)
    .optional()
    .allow(''),
  
  isActive: Joi.boolean().optional(),
  
  isDefault: Joi.boolean().optional(),
  
  devices: Joi.array()
    .items(objectIdSchema)
    .optional(),
  
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .optional(),
  
  settings: Joi.object({
    priority: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .optional(),
    
    maxDevices: Joi.number()
      .integer()
      .min(1)
      .max(1000)
      .optional(),
    
    allowAutoAdd: Joi.boolean().optional(),
    
    autoAddCriteria: Joi.object({
      deviceType: Joi.string().optional(),
      location: Joi.object({
        room: Joi.string().max(100).optional(),
        floor: Joi.string().max(100).optional(),
        building: Joi.string().max(100).optional(),
      }).optional(),
      tags: Joi.array()
        .items(Joi.string().max(50))
        .optional(),
    }).optional(),
  }).optional(),
  
  automation: Joi.object({
    enabled: Joi.boolean().optional(),
    
    rules: Joi.array()
      .items(Joi.object({
        trigger: Joi.string()
          .valid('device_state_change', 'time_based', 'manual', 'sensor_threshold')
          .required(),
        
        conditions: Joi.array()
          .items(Joi.object({
            type: Joi.string()
              .valid('device_state', 'time', 'day_of_week', 'sensor_value')
              .required(),
            
            operator: Joi.string()
              .valid('equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains')
              .required(),
            
            value: Joi.alternatives()
              .try(Joi.string(), Joi.number(), Joi.boolean(), Joi.array())
              .required(),
          }))
          .optional(),
        
        actions: Joi.array()
          .items(Joi.object({
            type: Joi.string()
              .valid('turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_temperature', 'set_color', 'notification')
              .required(),
            
            target: Joi.string()
              .valid('all', 'random', 'specific')
              .optional(),
            
            deviceIds: Joi.array()
              .items(objectIdSchema)
              .optional(),
            
            settings: Joi.object().optional(),
            
            delay: Joi.number()
              .integer()
              .min(0)
              .max(3600)
              .optional(),
          }))
          .min(1)
          .required(),
      }))
      .optional(),
  }).optional(),
  
  permissions: Joi.object({
    isPublic: Joi.boolean().optional(),
    
    sharedWith: Joi.array()
      .items(Joi.object({
        userId: objectIdSchema.required(),
        role: Joi.string()
          .valid('viewer', 'editor', 'admin')
          .required(),
        permissions: Joi.array()
          .items(Joi.string().valid('view', 'control', 'configure', 'share'))
          .min(1)
          .required(),
      }))
      .optional(),
  }).optional(),
  
  schedule: Joi.object({
    enabled: Joi.boolean().optional(),
    
    schedules: Joi.array()
      .items(Joi.object({
        name: Joi.string()
          .trim()
          .min(1)
          .max(100)
          .required(),
        
        isActive: Joi.boolean().optional(),
        
        trigger: Joi.object({
          type: Joi.string()
            .valid('time', 'sunrise', 'sunset')
            .required(),
          
          time: Joi.when('type', {
            is: 'time',
            then: Joi.string()
              .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
            otherwise: Joi.optional(),
          }),
          
          offset: Joi.when('type', {
            is: Joi.valid('sunrise', 'sunset'),
            then: Joi.number()
              .integer()
              .min(-120)
              .max(120)
              .optional(),
            otherwise: Joi.optional(),
          }),
        }).required(),
        
        days: Joi.array()
          .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
          .min(1)
          .required(),
        
        action: Joi.string()
          .valid('turn_on', 'turn_off', 'toggle', 'activate_scene')
          .required(),
        
        settings: Joi.object().optional(),
      }))
      .optional(),
  }).optional(),
});

// Group device management validation
export const validateGroupDeviceAdd = Joi.object({
  deviceIds: Joi.array()
    .items(objectIdSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one device must be specified',
      'array.max': 'Cannot add more than 100 devices at once',
    }),
});

export const validateGroupDeviceRemove = Joi.object({
  deviceIds: Joi.array()
    .items(objectIdSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one device must be specified',
    }),
});

// Group control validation
export const validateGroupControl = Joi.object({
  action: Joi.string()
    .valid('turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_temperature', 'set_color', 'activate_scene')
    .required(),
  
  target: Joi.string()
    .valid('all', 'random', 'specific')
    .optional()
    .default('all'),
  
  deviceIds: Joi.array()
    .items(objectIdSchema)
    .when('target', {
      is: 'specific',
      then: Joi.array().min(1).required(),
      otherwise: Joi.array().optional(),
    }),
  
  randomCount: Joi.number()
    .integer()
    .min(1)
    .when('target', {
      is: 'random',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  
  settings: Joi.object({
    brightness: Joi.number().min(0).max(100).optional(),
    color: Joi.object({
      hue: Joi.number().min(0).max(360).optional(),
      saturation: Joi.number().min(0).max(100).optional(),
      value: Joi.number().min(0).max(100).optional(),
      hex: Joi.string()
        .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .optional(),
    }).optional(),
    temperature: Joi.object({
      target: Joi.number().min(-50).max(100).optional(),
      unit: Joi.string().valid('C', 'F').optional(),
    }).optional(),
    speed: Joi.number().min(0).max(100).optional(),
    volume: Joi.number().min(0).max(100).optional(),
    mode: Joi.string().max(50).optional(),
  }).when('action', {
    is: Joi.valid('set_brightness', 'set_temperature', 'set_color'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  
  delay: Joi.number()
    .integer()
    .min(0)
    .max(3600)
    .optional()
    .default(0),
  
  sequence: Joi.object({
    enabled: Joi.boolean().optional().default(false),
    interval: Joi.number()
      .integer()
      .min(100)
      .max(60000)
      .when('enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    randomOrder: Joi.boolean().optional().default(false),
  }).optional(),
});

// Group search validation
export const validateGroupSearch = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
    }),
  
  type: Joi.string()
    .valid('room', 'device_type', 'custom', 'scene', 'automation')
    .optional(),
  
  isActive: Joi.boolean().optional(),
  
  isDefault: Joi.boolean().optional(),
  
  hasDevices: Joi.boolean().optional(),
  
  deviceCount: Joi.object({
    min: Joi.number().integer().min(0).optional(),
    max: Joi.number().integer().min(0).optional(),
  }).optional(),
  
  tags: Joi.array()
    .items(Joi.string().max(50))
    .optional(),
  
  sharedWith: objectIdSchema.optional(),
  
  page: Joi.number().integer().min(1).optional().default(1),
  
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  
  sortBy: Joi.string()
    .valid('name', 'type', 'deviceCount', 'createdAt', 'lastActivity')
    .optional()
    .default('name'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('asc'),
});

// Group sharing validation
export const validateGroupSharing = Joi.object({
  userId: objectIdSchema.required(),
  
  role: Joi.string()
    .valid('viewer', 'editor', 'admin')
    .required(),
  
  permissions: Joi.array()
    .items(Joi.string().valid('view', 'control', 'configure', 'share'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission must be granted',
    }),
  
  expiresAt: Joi.date()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Expiration date must be in the future',
    }),
});

// Group scene validation
export const validateGroupScene = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Scene name is required',
      'string.max': 'Scene name cannot exceed 100 characters',
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .default(''),
  
  icon: Joi.string()
    .max(50)
    .optional()
    .allow(''),
  
  deviceStates: Joi.array()
    .items(Joi.object({
      deviceId: objectIdSchema.required(),
      
      powerState: Joi.string()
        .valid('on', 'off')
        .required(),
      
      settings: Joi.object({
        brightness: Joi.number().min(0).max(100).optional(),
        color: Joi.object({
          hue: Joi.number().min(0).max(360).optional(),
          saturation: Joi.number().min(0).max(100).optional(),
          value: Joi.number().min(0).max(100).optional(),
          hex: Joi.string()
            .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
            .optional(),
        }).optional(),
        temperature: Joi.object({
          target: Joi.number().min(-50).max(100).optional(),
          unit: Joi.string().valid('C', 'F').optional(),
        }).optional(),
        speed: Joi.number().min(0).max(100).optional(),
        volume: Joi.number().min(0).max(100).optional(),
        mode: Joi.string().max(50).optional(),
      }).optional(),
    }))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one device state must be defined',
    }),
  
  isDefault: Joi.boolean()
    .optional()
    .default(false),
});

export default {
  validateGroupCreate,
  validateGroupUpdate,
  validateGroupDeviceAdd,
  validateGroupDeviceRemove,
  validateGroupControl,
  validateGroupSearch,
  validateGroupSharing,
  validateGroupScene,
};
