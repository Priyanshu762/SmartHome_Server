import Joi from 'joi';

/**
 * Mode validation schemas using Joi
 * Validates mode-related requests and data
 */

// MongoDB ObjectId validation
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

// Time validation (HH:MM format)
const timeSchema = Joi.string()
  .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
  .messages({
    'string.pattern.base': 'Invalid time format (use HH:MM)',
  });

// Mode creation validation
export const validateModeCreate = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Mode name is required',
      'string.max': 'Mode name cannot exceed 100 characters',
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .default(''),
  
  type: Joi.string()
    .valid('scene', 'schedule', 'automation', 'security', 'energy_saving', 'comfort', 'custom')
    .optional()
    .default('custom'),
  
  icon: Joi.string()
    .max(50)
    .optional()
    .allow(''),
  
  color: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid hex color format (use #RRGGBB or #RGB)',
    }),
  
  isActive: Joi.boolean()
    .optional()
    .default(false),
  
  isDefault: Joi.boolean()
    .optional()
    .default(false),
  
  priority: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .default(5),
  
  autoActivate: Joi.object({
    enabled: Joi.boolean()
      .optional()
      .default(false),
    
    triggers: Joi.array()
      .items(Joi.object({
        type: Joi.string()
          .valid('time', 'sunrise', 'sunset', 'device_state', 'sensor_value', 'location', 'manual')
          .required(),
        
        conditions: Joi.object({
          time: Joi.when('type', {
            is: 'time',
            then: timeSchema.required(),
            otherwise: Joi.optional(),
          }),
          
          days: Joi.array()
            .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
            .when('type', {
              is: Joi.valid('time', 'sunrise', 'sunset'),
              then: Joi.array().min(1).required(),
              otherwise: Joi.array().optional(),
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
          
          deviceId: Joi.when('type', {
            is: 'device_state',
            then: objectIdSchema.required(),
            otherwise: Joi.optional(),
          }),
          
          deviceState: Joi.when('type', {
            is: 'device_state',
            then: Joi.object({
              powerState: Joi.string().valid('on', 'off').optional(),
              property: Joi.string().optional(),
              operator: Joi.string().valid('equals', 'not_equals', 'greater_than', 'less_than', 'between').optional(),
              value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).optional(),
            }).required(),
            otherwise: Joi.optional(),
          }),
          
          sensorType: Joi.when('type', {
            is: 'sensor_value',
            then: Joi.string().valid('temperature', 'humidity', 'light', 'motion', 'sound', 'air_quality').required(),
            otherwise: Joi.optional(),
          }),
          
          sensorValue: Joi.when('type', {
            is: 'sensor_value',
            then: Joi.object({
              operator: Joi.string().valid('greater_than', 'less_than', 'between', 'equals').required(),
              value: Joi.number().required(),
              secondValue: Joi.when('operator', {
                is: 'between',
                then: Joi.number().required(),
                otherwise: Joi.optional(),
              }),
            }).required(),
            otherwise: Joi.optional(),
          }),
          
          location: Joi.when('type', {
            is: 'location',
            then: Joi.object({
              type: Joi.string().valid('enter', 'exit', 'near').required(),
              radius: Joi.number().min(10).max(10000).optional().default(100), // meters
              coordinates: Joi.object({
                latitude: Joi.number().min(-90).max(90).required(),
                longitude: Joi.number().min(-180).max(180).required(),
              }).required(),
            }).required(),
            otherwise: Joi.optional(),
           }),
        }).required(),
      }))
      .when('enabled', {
        is: true,
        then: Joi.array().min(1).required(),
        otherwise: Joi.array().optional(),
      }),
    
    conditions: Joi.array()
      .items(Joi.object({
        type: Joi.string()
          .valid('time_range', 'day_of_week', 'user_presence', 'weather', 'energy_price')
          .required(),
        
        operator: Joi.string()
          .valid('and', 'or', 'not')
          .optional()
          .default('and'),
        
        value: Joi.alternatives().try(
          // Time range
          Joi.object({
            start: timeSchema.required(),
            end: timeSchema.required(),
          }),
          // Day of week
          Joi.array().items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
          // User presence
          Joi.object({
            users: Joi.array().items(objectIdSchema).min(1).required(),
            state: Joi.string().valid('home', 'away', 'any').required(),
          }),
          // Weather
          Joi.object({
            condition: Joi.string().valid('sunny', 'cloudy', 'rainy', 'snowy', 'windy').required(),
            temperature: Joi.object({
              operator: Joi.string().valid('greater_than', 'less_than', 'between').required(),
              value: Joi.number().required(),
              secondValue: Joi.number().optional(),
            }).optional(),
          }),
          // Energy price
          Joi.object({
            operator: Joi.string().valid('greater_than', 'less_than').required(),
            value: Joi.number().min(0).required(),
          })
        ).required(),
      }))
      .optional(),
  }).optional(),
  
  actions: Joi.array()
    .items(Joi.object({
      type: Joi.string()
        .valid('device_control', 'group_control', 'notification', 'webhook', 'delay', 'scene_activation')
        .required(),
      
      target: Joi.object({
        type: Joi.string()
          .valid('device', 'group', 'all_devices')
          .required(),
        
        ids: Joi.array()
          .items(objectIdSchema)
          .when('type', {
            is: Joi.valid('device', 'group'),
            then: Joi.array().min(1).required(),
            otherwise: Joi.array().optional(),
          }),
        
        filter: Joi.object({
          deviceType: Joi.string().optional(),
          location: Joi.object({
            room: Joi.string().max(100).optional(),
            floor: Joi.string().max(100).optional(),
            building: Joi.string().max(100).optional(),
          }).optional(),
          tags: Joi.array().items(Joi.string().max(50)).optional(),
          capability: Joi.string().optional(),
        }).when('type', {
          is: 'all_devices',
          then: Joi.optional(),
          otherwise: Joi.optional(),
        }),
      }).when('type', {
        is: Joi.valid('device_control', 'group_control', 'scene_activation'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      
      action: Joi.string()
        .valid('turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_temperature', 'set_color', 'set_mode')
        .when('type', {
          is: Joi.valid('device_control', 'group_control'),
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
      }).when('type', {
        is: Joi.valid('device_control', 'group_control'),
        then: Joi.optional(),
        otherwise: Joi.optional(),
      }),
      
      notification: Joi.object({
        title: Joi.string().max(100).required(),
        message: Joi.string().max(500).required(),
        priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional().default('normal'),
        channels: Joi.array()
          .items(Joi.string().valid('push', 'email', 'sms', 'in_app'))
          .min(1)
          .optional()
          .default(['push', 'in_app']),
        users: Joi.array()
          .items(objectIdSchema)
          .optional(), // If empty, notify all users with access
      }).when('type', {
        is: 'notification',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      
      webhook: Joi.object({
        url: Joi.string().uri().required(),
        method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH').optional().default('POST'),
        headers: Joi.object().optional(),
        body: Joi.object().optional(),
        timeout: Joi.number().integer().min(1000).max(30000).optional().default(5000),
      }).when('type', {
        is: 'webhook',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      
      delay: Joi.object({
        duration: Joi.number()
          .integer()
          .min(1)
          .max(86400) // Max 24 hours
          .required(),
        unit: Joi.string()
          .valid('seconds', 'minutes', 'hours')
          .optional()
          .default('seconds'),
      }).when('type', {
        is: 'delay',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      
      sceneId: objectIdSchema.when('type', {
        is: 'scene_activation',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      
      order: Joi.number()
        .integer()
        .min(1)
        .optional()
        .default(1),
      
      isEnabled: Joi.boolean()
        .optional()
        .default(true),
    }))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one action must be defined',
    }),
  
  schedule: Joi.object({
    enabled: Joi.boolean()
      .optional()
      .default(false),
    
    start: Joi.object({
      type: Joi.string()
        .valid('time', 'sunrise', 'sunset', 'manual')
        .required(),
      
      time: Joi.when('type', {
        is: 'time',
        then: timeSchema.required(),
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
      
      days: Joi.array()
        .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
        .when('type', {
          is: Joi.valid('time', 'sunrise', 'sunset'),
          then: Joi.array().min(1).required(),
          otherwise: Joi.array().optional(),
        }),
    }).when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    
    end: Joi.object({
      type: Joi.string()
        .valid('time', 'sunrise', 'sunset', 'duration', 'manual')
        .required(),
      
      time: Joi.when('type', {
        is: 'time',
        then: timeSchema.required(),
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
      
      duration: Joi.when('type', {
        is: 'duration',
        then: Joi.object({
          value: Joi.number().integer().min(1).max(1440).required(), // Max 24 hours in minutes
          unit: Joi.string().valid('minutes', 'hours').optional().default('minutes'),
        }).required(),
        otherwise: Joi.optional(),
      }),
    }).when('enabled', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }).optional(),
  
  settings: Joi.object({
    allowManualOverride: Joi.boolean()
      .optional()
      .default(true),
    
    restoreOnExit: Joi.boolean()
      .optional()
      .default(false),
    
    previousState: Joi.object().optional(), // Stored automatically
    
    energySaving: Joi.object({
      enabled: Joi.boolean().optional().default(false),
      maxPowerUsage: Joi.number().min(0).optional(),
      priorityDevices: Joi.array().items(objectIdSchema).optional(),
    }).optional(),
    
    security: Joi.object({
      enabled: Joi.boolean().optional().default(false),
      armDelay: Joi.number().integer().min(0).max(300).optional().default(30), // seconds
      requireUserConfirmation: Joi.boolean().optional().default(false),
      notifyOnActivation: Joi.boolean().optional().default(true),
    }).optional(),
    
    geoFencing: Joi.object({
      enabled: Joi.boolean().optional().default(false),
      locations: Joi.array()
        .items(Joi.object({
          name: Joi.string().max(100).required(),
          coordinates: Joi.object({
            latitude: Joi.number().min(-90).max(90).required(),
            longitude: Joi.number().min(-180).max(180).required(),
          }).required(),
          radius: Joi.number().min(10).max(10000).required(), // meters
          action: Joi.string().valid('activate', 'deactivate').required(),
        }))
        .when('enabled', {
          is: true,
          then: Joi.array().min(1).required(),
          otherwise: Joi.array().optional(),
        }),
    }).optional(),
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
          .items(Joi.string().valid('view', 'activate', 'deactivate', 'configure', 'share'))
          .min(1)
          .required(),
      }))
      .optional()
      .default([]),
  }).optional(),
  
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .optional()
    .default([]),
});

// Mode update validation
export const validateModeUpdate = Joi.object({
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
    .valid('scene', 'schedule', 'automation', 'security', 'energy_saving', 'comfort', 'custom')
    .optional(),
  
  icon: Joi.string()
    .max(50)
    .optional()
    .allow(''),
  
  color: Joi.string()
    .pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid hex color format (use #RRGGBB or #RGB)',
    }),
  
  isActive: Joi.boolean().optional(),
  
  isDefault: Joi.boolean().optional(),
  
  priority: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional(),
  
  // Allow partial updates of nested objects
  autoActivate: Joi.object().optional(),
  actions: Joi.array().optional(),
  schedule: Joi.object().optional(),
  settings: Joi.object().optional(),
  permissions: Joi.object().optional(),
  
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .optional(),
});

// Mode activation validation
export const validateModeActivation = Joi.object({
  force: Joi.boolean()
    .optional()
    .default(false),
  
  duration: Joi.object({
    value: Joi.number().integer().min(1).max(1440).optional(), // Max 24 hours in minutes
    unit: Joi.string().valid('minutes', 'hours').optional().default('minutes'),
  }).optional(),
  
  overrides: Joi.object({
    actions: Joi.array().optional(),
    settings: Joi.object().optional(),
  }).optional(),
});

// Mode search validation
export const validateModeSearch = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
    }),
  
  type: Joi.string()
    .valid('scene', 'schedule', 'automation', 'security', 'energy_saving', 'comfort', 'custom')
    .optional(),
  
  isActive: Joi.boolean().optional(),
  
  isDefault: Joi.boolean().optional(),
  
  priority: Joi.number().integer().min(1).max(10).optional(),
  
  tags: Joi.array()
    .items(Joi.string().max(50))
    .optional(),
  
  sharedWith: objectIdSchema.optional(),
  
  page: Joi.number().integer().min(1).optional().default(1),
  
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  
  sortBy: Joi.string()
    .valid('name', 'type', 'priority', 'createdAt', 'lastActivated')
    .optional()
    .default('name'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('asc'),
});

// Mode sharing validation
export const validateModeSharing = Joi.object({
  userId: objectIdSchema.required(),
  
  role: Joi.string()
    .valid('viewer', 'editor', 'admin')
    .required(),
  
  permissions: Joi.array()
    .items(Joi.string().valid('view', 'activate', 'deactivate', 'configure', 'share'))
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

export default {
  validateModeCreate,
  validateModeUpdate,
  validateModeActivation,
  validateModeSearch,
  validateModeSharing,
};
