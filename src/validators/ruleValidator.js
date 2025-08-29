import Joi from 'joi';

/**
 * Rule validation schemas using Joi
 * Validates automation rule-related requests and data
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

// Rule creation validation
export const validateRuleCreate = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Rule name is required',
      'string.max': 'Rule name cannot exceed 100 characters',
    }),
  
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .default(''),
  
  type: Joi.string()
    .valid('simple', 'advanced', 'security', 'energy', 'comfort', 'scene', 'notification')
    .optional()
    .default('simple'),
  
  category: Joi.string()
    .valid('lighting', 'climate', 'security', 'entertainment', 'energy', 'safety', 'convenience', 'custom')
    .optional()
    .default('custom'),
  
  priority: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .default(5),
  
  isActive: Joi.boolean()
    .optional()
    .default(true),
  
  triggers: Joi.array()
    .items(Joi.object({
      id: Joi.string()
        .optional()
        .default(() => Date.now().toString()),
      
      type: Joi.string()
        .valid('time', 'device_state', 'sensor_value', 'user_action', 'system_event', 'webhook', 'manual', 'sunrise', 'sunset', 'location')
        .required(),
      
      name: Joi.string()
        .max(100)
        .optional(),
      
      // Time-based trigger
      time: Joi.when('type', {
        is: 'time',
        then: Joi.object({
          hour: Joi.number().integer().min(0).max(23).required(),
          minute: Joi.number().integer().min(0).max(59).required(),
          days: Joi.array()
            .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
            .min(1)
            .required(),
          timezone: Joi.string().optional().default('UTC'),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Sunrise/Sunset trigger
      sunEvent: Joi.when('type', {
        is: Joi.valid('sunrise', 'sunset'),
        then: Joi.object({
          event: Joi.string().valid('sunrise', 'sunset').required(),
          offset: Joi.number().integer().min(-120).max(120).optional().default(0), // minutes
          days: Joi.array()
            .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
            .min(1)
            .required(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Device state trigger
      device: Joi.when('type', {
        is: 'device_state',
        then: Joi.object({
          deviceId: objectIdSchema.required(),
          property: Joi.string().required(), // e.g., 'powerState', 'brightness', 'temperature'
          operator: Joi.string().valid('equals', 'not_equals', 'greater_than', 'less_than', 'between', 'changes', 'changes_to', 'changes_from').required(),
          value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).optional(),
          secondValue: Joi.when('operator', {
            is: 'between',
            then: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            otherwise: Joi.optional(),
          }),
          duration: Joi.number().integer().min(1).max(3600).optional(), // seconds to wait before triggering
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Sensor value trigger
      sensor: Joi.when('type', {
        is: 'sensor_value',
        then: Joi.object({
          sensorType: Joi.string().valid('temperature', 'humidity', 'light', 'motion', 'sound', 'air_quality', 'pressure', 'co2', 'energy').required(),
          deviceId: objectIdSchema.optional(), // If not specified, uses any sensor of this type
          operator: Joi.string().valid('greater_than', 'less_than', 'between', 'equals', 'not_equals').required(),
          value: Joi.number().required(),
          secondValue: Joi.when('operator', {
            is: 'between',
            then: Joi.number().required(),
            otherwise: Joi.optional(),
          }),
          duration: Joi.number().integer().min(1).max(3600).optional(), // seconds
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // User action trigger
      userAction: Joi.when('type', {
        is: 'user_action',
        then: Joi.object({
          action: Joi.string().valid('login', 'logout', 'arrive_home', 'leave_home', 'button_press', 'app_open', 'app_close').required(),
          userId: objectIdSchema.optional(), // If not specified, any user
          deviceId: objectIdSchema.optional(), // For button_press actions
          location: Joi.object({
            type: Joi.string().valid('home', 'away', 'specific').required(),
            coordinates: Joi.when('type', {
              is: 'specific',
              then: Joi.object({
                latitude: Joi.number().min(-90).max(90).required(),
                longitude: Joi.number().min(-180).max(180).required(),
                radius: Joi.number().min(10).max(10000).required(),
              }).required(),
              otherwise: Joi.optional(),
            }),
          }).optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // System event trigger
      systemEvent: Joi.when('type', {
        is: 'system_event',
        then: Joi.object({
          event: Joi.string().valid('startup', 'shutdown', 'connection_lost', 'connection_restored', 'low_battery', 'update_available', 'backup_completed', 'error_occurred').required(),
          deviceId: objectIdSchema.optional(), // For device-specific events
          severity: Joi.string().valid('info', 'warning', 'error', 'critical').optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Webhook trigger
      webhook: Joi.when('type', {
        is: 'webhook',
        then: Joi.object({
          path: Joi.string().pattern(/^\/[a-zA-Z0-9\-_\/]*$/).required(),
          method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH').optional().default('POST'),
          authentication: Joi.object({
            type: Joi.string().valid('none', 'token', 'basic').optional().default('token'),
            token: Joi.string().when('type', {
              is: 'token',
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            username: Joi.string().when('type', {
              is: 'basic',
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            password: Joi.string().when('type', {
              is: 'basic',
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
          }).optional(),
          expectedData: Joi.object().optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Location trigger
      location: Joi.when('type', {
        is: 'location',
        then: Joi.object({
          action: Joi.string().valid('enter', 'exit').required(),
          coordinates: Joi.object({
            latitude: Joi.number().min(-90).max(90).required(),
            longitude: Joi.number().min(-180).max(180).required(),
          }).required(),
          radius: Joi.number().min(10).max(10000).required(), // meters
          users: Joi.array().items(objectIdSchema).optional(), // If not specified, any user
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      isEnabled: Joi.boolean()
        .optional()
        .default(true),
    }))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one trigger must be defined',
    }),
  
  conditions: Joi.array()
    .items(Joi.object({
      id: Joi.string()
        .optional()
        .default(() => Date.now().toString()),
      
      type: Joi.string()
        .valid('device_state', 'time_range', 'day_of_week', 'user_presence', 'weather', 'system_state', 'energy_price', 'custom')
        .required(),
      
      operator: Joi.string()
        .valid('and', 'or', 'not')
        .optional()
        .default('and'),
      
      // Device state condition
      device: Joi.when('type', {
        is: 'device_state',
        then: Joi.object({
          deviceId: objectIdSchema.required(),
          property: Joi.string().required(),
          operator: Joi.string().valid('equals', 'not_equals', 'greater_than', 'less_than', 'between').required(),
          value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).required(),
          secondValue: Joi.when('operator', {
            is: 'between',
            then: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
            otherwise: Joi.optional(),
          }),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Time range condition
      timeRange: Joi.when('type', {
        is: 'time_range',
        then: Joi.object({
          start: timeSchema.required(),
          end: timeSchema.required(),
          timezone: Joi.string().optional().default('UTC'),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Day of week condition
      dayOfWeek: Joi.when('type', {
        is: 'day_of_week',
        then: Joi.array()
          .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
          .min(1)
          .required(),
        otherwise: Joi.optional(),
      }),
      
      // User presence condition
      userPresence: Joi.when('type', {
        is: 'user_presence',
        then: Joi.object({
          users: Joi.array().items(objectIdSchema).min(1).required(),
          state: Joi.string().valid('home', 'away', 'any').required(),
          location: Joi.object({
            coordinates: Joi.object({
              latitude: Joi.number().min(-90).max(90).required(),
              longitude: Joi.number().min(-180).max(180).required(),
            }).required(),
            radius: Joi.number().min(10).max(10000).required(),
          }).optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Weather condition
      weather: Joi.when('type', {
        is: 'weather',
        then: Joi.object({
          condition: Joi.string().valid('sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'foggy').optional(),
          temperature: Joi.object({
            operator: Joi.string().valid('greater_than', 'less_than', 'between').required(),
            value: Joi.number().required(),
            secondValue: Joi.number().optional(),
            unit: Joi.string().valid('C', 'F').optional().default('C'),
          }).optional(),
          humidity: Joi.object({
            operator: Joi.string().valid('greater_than', 'less_than', 'between').required(),
            value: Joi.number().min(0).max(100).required(),
            secondValue: Joi.number().min(0).max(100).optional(),
          }).optional(),
          windSpeed: Joi.object({
            operator: Joi.string().valid('greater_than', 'less_than').required(),
            value: Joi.number().min(0).required(),
            unit: Joi.string().valid('mph', 'kmh', 'ms').optional().default('kmh'),
          }).optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // System state condition
      systemState: Joi.when('type', {
        is: 'system_state',
        then: Joi.object({
          property: Joi.string().valid('mode', 'security_armed', 'energy_saving', 'maintenance_mode').required(),
          operator: Joi.string().valid('equals', 'not_equals').required(),
          value: Joi.alternatives().try(Joi.string(), Joi.boolean()).required(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Energy price condition
      energyPrice: Joi.when('type', {
        is: 'energy_price',
        then: Joi.object({
          operator: Joi.string().valid('greater_than', 'less_than', 'between').required(),
          value: Joi.number().min(0).required(),
          secondValue: Joi.number().min(0).optional(),
          currency: Joi.string().length(3).optional().default('USD'),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Custom condition
      custom: Joi.when('type', {
        is: 'custom',
        then: Joi.object({
          expression: Joi.string().max(1000).required(), // JavaScript expression
          variables: Joi.object().optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      isEnabled: Joi.boolean()
        .optional()
        .default(true),
    }))
    .optional()
    .default([]),
  
  actions: Joi.array()
    .items(Joi.object({
      id: Joi.string()
        .optional()
        .default(() => Date.now().toString()),
      
      type: Joi.string()
        .valid('device_control', 'group_control', 'mode_activation', 'notification', 'webhook', 'email', 'sms', 'delay', 'scene_activation', 'custom_script')
        .required(),
      
      order: Joi.number()
        .integer()
        .min(1)
        .optional()
        .default(1),
      
      // Device control action
      device: Joi.when('type', {
        is: 'device_control',
        then: Joi.object({
          deviceId: objectIdSchema.required(),
          action: Joi.string().valid('turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_temperature', 'set_color', 'set_mode').required(),
          settings: Joi.object({
            brightness: Joi.number().min(0).max(100).optional(),
            color: Joi.object({
              hue: Joi.number().min(0).max(360).optional(),
              saturation: Joi.number().min(0).max(100).optional(),
              value: Joi.number().min(0).max(100).optional(),
              hex: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
            }).optional(),
            temperature: Joi.object({
              target: Joi.number().min(-50).max(100).optional(),
              unit: Joi.string().valid('C', 'F').optional(),
            }).optional(),
            speed: Joi.number().min(0).max(100).optional(),
            volume: Joi.number().min(0).max(100).optional(),
            mode: Joi.string().max(50).optional(),
          }).optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Group control action
      group: Joi.when('type', {
        is: 'group_control',
        then: Joi.object({
          groupId: objectIdSchema.required(),
          action: Joi.string().valid('turn_on', 'turn_off', 'toggle', 'activate_scene').required(),
          target: Joi.string().valid('all', 'random', 'specific').optional().default('all'),
          deviceIds: Joi.array().items(objectIdSchema).optional(),
          randomCount: Joi.number().integer().min(1).optional(),
          settings: Joi.object().optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Mode activation action
      mode: Joi.when('type', {
        is: 'mode_activation',
        then: Joi.object({
          modeId: objectIdSchema.required(),
          action: Joi.string().valid('activate', 'deactivate', 'toggle').required(),
          duration: Joi.object({
            value: Joi.number().integer().min(1).max(1440).optional(),
            unit: Joi.string().valid('minutes', 'hours').optional().default('minutes'),
          }).optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Notification action
      notification: Joi.when('type', {
        is: 'notification',
        then: Joi.object({
          title: Joi.string().max(100).required(),
          message: Joi.string().max(500).required(),
          priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional().default('normal'),
          channels: Joi.array()
            .items(Joi.string().valid('push', 'email', 'sms', 'in_app'))
            .min(1)
            .optional()
            .default(['push', 'in_app']),
          users: Joi.array().items(objectIdSchema).optional(),
          sound: Joi.string().optional(),
          icon: Joi.string().optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Webhook action
      webhook: Joi.when('type', {
        is: 'webhook',
        then: Joi.object({
          url: Joi.string().uri().required(),
          method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').optional().default('POST'),
          headers: Joi.object().optional(),
          body: Joi.object().optional(),
          timeout: Joi.number().integer().min(1000).max(30000).optional().default(5000),
          retries: Joi.number().integer().min(0).max(5).optional().default(0),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Email action
      email: Joi.when('type', {
        is: 'email',
        then: Joi.object({
          to: Joi.array().items(Joi.string().email()).min(1).required(),
          subject: Joi.string().max(200).required(),
          body: Joi.string().max(5000).required(),
          isHtml: Joi.boolean().optional().default(false),
          attachments: Joi.array().items(Joi.string()).optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // SMS action
      sms: Joi.when('type', {
        is: 'sms',
        then: Joi.object({
          to: Joi.array().items(Joi.string().pattern(/^\+[1-9]\d{1,14}$/)).min(1).required(),
          message: Joi.string().max(160).required(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Delay action
      delay: Joi.when('type', {
        is: 'delay',
        then: Joi.object({
          duration: Joi.number().integer().min(1).max(86400).required(), // Max 24 hours in seconds
          unit: Joi.string().valid('seconds', 'minutes', 'hours').optional().default('seconds'),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Scene activation action
      scene: Joi.when('type', {
        is: 'scene_activation',
        then: Joi.object({
          sceneId: objectIdSchema.required(),
          transition: Joi.object({
            duration: Joi.number().integer().min(0).max(300).optional().default(0), // seconds
            type: Joi.string().valid('instant', 'fade', 'smooth').optional().default('instant'),
          }).optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      // Custom script action
      customScript: Joi.when('type', {
        is: 'custom_script',
        then: Joi.object({
          script: Joi.string().max(10000).required(), // JavaScript code
          timeout: Joi.number().integer().min(1000).max(60000).optional().default(10000),
          variables: Joi.object().optional(),
        }).required(),
        otherwise: Joi.optional(),
      }),
      
      isEnabled: Joi.boolean()
        .optional()
        .default(true),
      
      continueOnError: Joi.boolean()
        .optional()
        .default(false),
    }))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one action must be defined',
    }),
  
  settings: Joi.object({
    triggerLogic: Joi.string()
      .valid('any', 'all')
      .optional()
      .default('any'), // 'any' = OR logic, 'all' = AND logic
    
    conditionLogic: Joi.string()
      .valid('any', 'all')
      .optional()
      .default('all'),
    
    cooldownPeriod: Joi.number()
      .integer()
      .min(0)
      .max(86400) // Max 24 hours
      .optional()
      .default(0), // seconds
    
    maxExecutions: Joi.object({
      enabled: Joi.boolean().optional().default(false),
      count: Joi.number().integer().min(1).when('enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      period: Joi.string().valid('hour', 'day', 'week', 'month').when('enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    }).optional(),
    
    schedule: Joi.object({
      enabled: Joi.boolean().optional().default(false),
      activeHours: Joi.object({
        start: timeSchema.required(),
        end: timeSchema.required(),
      }).when('enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      activeDays: Joi.array()
        .items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))
        .when('enabled', {
          is: true,
          then: Joi.array().min(1).required(),
          otherwise: Joi.array().optional(),
        }),
    }).optional(),
    
    logging: Joi.object({
      enabled: Joi.boolean().optional().default(true),
      level: Joi.string().valid('minimal', 'detailed', 'full').optional().default('detailed'),
      retentionDays: Joi.number().integer().min(1).max(365).optional().default(30),
    }).optional(),
  }).optional(),
  
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .optional()
    .default([]),
});

// Rule update validation
export const validateRuleUpdate = Joi.object({
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
    .valid('simple', 'advanced', 'security', 'energy', 'comfort', 'scene', 'notification')
    .optional(),
  
  category: Joi.string()
    .valid('lighting', 'climate', 'security', 'entertainment', 'energy', 'safety', 'convenience', 'custom')
    .optional(),
  
  priority: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional(),
  
  isActive: Joi.boolean().optional(),
  
  triggers: Joi.array().optional(),
  conditions: Joi.array().optional(),
  actions: Joi.array().optional(),
  settings: Joi.object().optional(),
  
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .optional(),
});

// Rule execution validation
export const validateRuleExecution = Joi.object({
  force: Joi.boolean()
    .optional()
    .default(false),
  
  skipConditions: Joi.boolean()
    .optional()
    .default(false),
  
  context: Joi.object()
    .optional(), // Additional context data for the execution
});

// Rule search validation
export const validateRuleSearch = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query cannot exceed 100 characters',
    }),
  
  type: Joi.string()
    .valid('simple', 'advanced', 'security', 'energy', 'comfort', 'scene', 'notification')
    .optional(),
  
  category: Joi.string()
    .valid('lighting', 'climate', 'security', 'entertainment', 'energy', 'safety', 'convenience', 'custom')
    .optional(),
  
  isActive: Joi.boolean().optional(),
  
  priority: Joi.number().integer().min(1).max(10).optional(),
  
  tags: Joi.array()
    .items(Joi.string().max(50))
    .optional(),
  
  triggerType: Joi.string()
    .valid('time', 'device_state', 'sensor_value', 'user_action', 'system_event', 'webhook', 'manual', 'sunrise', 'sunset', 'location')
    .optional(),
  
  actionType: Joi.string()
    .valid('device_control', 'group_control', 'mode_activation', 'notification', 'webhook', 'email', 'sms', 'delay', 'scene_activation', 'custom_script')
    .optional(),
  
  page: Joi.number().integer().min(1).optional().default(1),
  
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  
  sortBy: Joi.string()
    .valid('name', 'type', 'category', 'priority', 'createdAt', 'lastExecuted', 'executionCount')
    .optional()
    .default('name'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('asc'),
});

// Rule test validation
export const validateRuleTest = Joi.object({
  mockTrigger: Joi.object({
    type: Joi.string().required(),
    data: Joi.object().required(),
  }).optional(),
  
  mockConditions: Joi.array()
    .items(Joi.object({
      id: Joi.string().required(),
      result: Joi.boolean().required(),
    }))
    .optional(),
  
  dryRun: Joi.boolean()
    .optional()
    .default(true),
});

export default {
  validateRuleCreate,
  validateRuleUpdate,
  validateRuleExecution,
  validateRuleSearch,
  validateRuleTest,
};
