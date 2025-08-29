/**
 * Application constants
 * Centralized constants for the Smart Home application
 */

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
};

// Device Types
export const DEVICE_TYPES = {
  AIR_CONDITIONER: 'air_conditioner',
  SMART_LIGHT: 'smart_light',
  CEILING_FAN: 'ceiling_fan',
  SPRINKLER: 'sprinkler',
  SECURITY_CAMERA: 'security_camera',
  SMART_THERMOSTAT: 'smart_thermostat',
  SMART_PLUG: 'smart_plug',
  DOOR_LOCK: 'door_lock',
  MOTION_SENSOR: 'motion_sensor',
  TEMPERATURE_SENSOR: 'temperature_sensor',
  HUMIDITY_SENSOR: 'humidity_sensor',
  SMOKE_DETECTOR: 'smoke_detector',
};

// Device Status
export const DEVICE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
  ERROR: 'error',
};

// Device Power States
export const POWER_STATES = {
  ON: 'on',
  OFF: 'off',
};

// Group Types (Rooms)
export const GROUP_TYPES = {
  LIVING_ROOM: 'living_room',
  BEDROOM: 'bedroom',
  KITCHEN: 'kitchen',
  BATHROOM: 'bathroom',
  GARAGE: 'garage',
  BACKYARD: 'backyard',
  OFFICE: 'office',
  BASEMENT: 'basement',
  ATTIC: 'attic',
  DINING_ROOM: 'dining_room',
  GUEST_ROOM: 'guest_room',
  LAUNDRY_ROOM: 'laundry_room',
};

// Performance Modes
export const PERFORMANCE_MODES = {
  POWER_SAVING: 'power_saving',
  PERFORMANCE: 'performance',
  CUSTOM: 'custom',
  ECO: 'eco',
  SLEEP: 'sleep',
  AWAY: 'away',
  HOME: 'home',
};

// Rule Types
export const RULE_TYPES = {
  TIME_BASED: 'time_based',
  SENSOR_BASED: 'sensor_based',
  DEVICE_BASED: 'device_based',
  LOCATION_BASED: 'location_based',
  CONDITION_BASED: 'condition_based',
};

// Rule Actions
export const RULE_ACTIONS = {
  TURN_ON: 'turn_on',
  TURN_OFF: 'turn_off',
  SET_TEMPERATURE: 'set_temperature',
  SET_BRIGHTNESS: 'set_brightness',
  SET_MODE: 'set_mode',
  SEND_NOTIFICATION: 'send_notification',
  TRIGGER_ALARM: 'trigger_alarm',
};

// Rule Conditions
export const RULE_CONDITIONS = {
  TIME_EQUALS: 'time_equals',
  TIME_BETWEEN: 'time_between',
  TEMPERATURE_ABOVE: 'temperature_above',
  TEMPERATURE_BELOW: 'temperature_below',
  HUMIDITY_ABOVE: 'humidity_above',
  HUMIDITY_BELOW: 'humidity_below',
  DEVICE_STATE: 'device_state',
  MOTION_DETECTED: 'motion_detected',
  NO_MOTION: 'no_motion',
  USER_AWAY: 'user_away',
  USER_HOME: 'user_home',
};

// API Error Codes
export const ERROR_CODES = {
  // Authentication Errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource Errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Device Errors
  DEVICE_OFFLINE: 'DEVICE_OFFLINE',
  DEVICE_ERROR: 'DEVICE_ERROR',
  DEVICE_TIMEOUT: 'DEVICE_TIMEOUT',
  
  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Socket Events
export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // Authentication
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  
  // Device Events
  DEVICE_UPDATE: 'device_update',
  DEVICE_STATUS_CHANGE: 'device_status_change',
  DEVICE_TOGGLE: 'device_toggle',
  
  // Dashboard Events
  DASHBOARD_UPDATE: 'dashboard_update',
  ENERGY_UPDATE: 'energy_update',
  SYSTEM_STATUS: 'system_status',
  
  // Rule Events
  RULE_TRIGGERED: 'rule_triggered',
  RULE_EXECUTED: 'rule_executed',
  
  // Group Events
  GROUP_UPDATE: 'group_update',
  
  // Mode Events
  MODE_CHANGE: 'mode_change',
  
  // Notifications
  NOTIFICATION: 'notification',
  ALERT: 'alert',
  
  // Errors
  ERROR: 'error',
};

// Timer Types
export const TIMER_TYPES = {
  TURN_ON: 'turn_on',
  TURN_OFF: 'turn_off',
  TOGGLE: 'toggle',
};

// Log Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

// Energy Measurement Units
export const ENERGY_UNITS = {
  WATTS: 'W',
  KILOWATTS: 'kW',
  KILOWATT_HOURS: 'kWh',
  VOLTS: 'V',
  AMPS: 'A',
};

// Temperature Units
export const TEMPERATURE_UNITS = {
  CELSIUS: 'C',
  FAHRENHEIT: 'F',
  KELVIN: 'K',
};

// Default Values
export const DEFAULTS = {
  DEVICE_TIMEOUT: 30000, // 30 seconds
  RULE_CHECK_INTERVAL: 60000, // 1 minute
  ENERGY_UPDATE_INTERVAL: 5000, // 5 seconds
  MAX_TIMER_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  MAX_DEVICES_PER_USER: 100,
  MAX_GROUPS_PER_USER: 20,
  MAX_RULES_PER_USER: 50,
  MAX_MODES_PER_USER: 10,
  PAGINATION_LIMIT: 50,
  SEARCH_RESULTS_LIMIT: 100,
};

// Validation Patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  MAC_ADDRESS: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
};
