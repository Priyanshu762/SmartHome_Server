import mongoose from 'mongoose';
import { DEVICE_TYPES, DEVICE_STATUS, POWER_STATES, ENERGY_UNITS } from '../config/constants.js';

/**
 * Device Schema
 * Represents smart home devices with their capabilities and current state
 */
const deviceSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
    maxlength: [100, 'Device name cannot exceed 100 characters'],
  },
  
  type: {
    type: String,
    required: [true, 'Device type is required'],
    enum: Object.values(DEVICE_TYPES),
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  
  manufacturer: {
    type: String,
    trim: true,
    maxlength: [100, 'Manufacturer name cannot exceed 100 characters'],
  },
  
  model: {
    type: String,
    trim: true,
    maxlength: [100, 'Model name cannot exceed 100 characters'],
  },
  
  serialNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Serial number cannot exceed 100 characters'],
  },
  
  // Network Information
  ipAddress: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v);
      },
      message: 'Invalid IP address format',
    },
  },
  
  macAddress: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(v);
      },
      message: 'Invalid MAC address format',
    },
  },
  
  port: {
    type: Number,
    min: [1, 'Port must be between 1 and 65535'],
    max: [65535, 'Port must be between 1 and 65535'],
  },
  
  // Device State
  status: {
    type: String,
    enum: Object.values(DEVICE_STATUS),
    default: DEVICE_STATUS.OFFLINE,
  },
  
  powerState: {
    type: String,
    enum: Object.values(POWER_STATES),
    default: POWER_STATES.OFF,
  },
  
  isOnline: {
    type: Boolean,
    default: false,
  },
  
  lastSeen: {
    type: Date,
    default: null,
  },
  
  // Device Capabilities
  capabilities: {
    canToggle: {
      type: Boolean,
      default: true,
    },
    canDim: {
      type: Boolean,
      default: false,
    },
    canChangeColor: {
      type: Boolean,
      default: false,
    },
    canSetTemperature: {
      type: Boolean,
      default: false,
    },
    canSetTimer: {
      type: Boolean,
      default: true,
    },
    canRecordVideo: {
      type: Boolean,
      default: false,
    },
    canDetectMotion: {
      type: Boolean,
      default: false,
    },
    canMeasureEnergy: {
      type: Boolean,
      default: false,
    },
    canSetSpeed: {
      type: Boolean,
      default: false,
    },
    hasLock: {
      type: Boolean,
      default: false,
    },
  },
  
  // Current Settings
  settings: {
    brightness: {
      type: Number,
      min: [0, 'Brightness must be between 0 and 100'],
      max: [100, 'Brightness must be between 0 and 100'],
      default: 100,
    },
    
    color: {
      hue: {
        type: Number,
        min: [0, 'Hue must be between 0 and 360'],
        max: [360, 'Hue must be between 0 and 360'],
        default: 0,
      },
      saturation: {
        type: Number,
        min: [0, 'Saturation must be between 0 and 100'],
        max: [100, 'Saturation must be between 0 and 100'],
        default: 0,
      },
      value: {
        type: Number,
        min: [0, 'Value must be between 0 and 100'],
        max: [100, 'Value must be between 0 and 100'],
        default: 100,
      },
      hex: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
          },
          message: 'Invalid hex color format',
        },
        default: '#FFFFFF',
      },
    },
    
    temperature: {
      current: {
        type: Number,
        min: [-50, 'Temperature cannot be below -50°C'],
        max: [100, 'Temperature cannot be above 100°C'],
        default: 20,
      },
      target: {
        type: Number,
        min: [-50, 'Temperature cannot be below -50°C'],
        max: [100, 'Temperature cannot be above 100°C'],
        default: 22,
      },
      unit: {
        type: String,
        enum: ['C', 'F'],
        default: 'C',
      },
    },
    
    speed: {
      type: Number,
      min: [0, 'Speed must be between 0 and 100'],
      max: [100, 'Speed must be between 0 and 100'],
      default: 50,
    },
    
    volume: {
      type: Number,
      min: [0, 'Volume must be between 0 and 100'],
      max: [100, 'Volume must be between 0 and 100'],
      default: 50,
    },
    
    mode: {
      type: String,
      default: 'auto',
    },
    
    isLocked: {
      type: Boolean,
      default: false,
    },
    
    isRecording: {
      type: Boolean,
      default: false,
    },
  },
  
  // Energy Monitoring
  energy: {
    currentUsage: {
      type: Number,
      min: [0, 'Energy usage cannot be negative'],
      default: 0,
    },
    
    dailyUsage: {
      type: Number,
      min: [0, 'Daily usage cannot be negative'],
      default: 0,
    },
    
    monthlyUsage: {
      type: Number,
      min: [0, 'Monthly usage cannot be negative'],
      default: 0,
    },
    
    unit: {
      type: String,
      enum: Object.values(ENERGY_UNITS),
      default: ENERGY_UNITS.WATTS,
    },
    
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  
  // Location & Organization
  location: {
    room: {
      type: String,
      default: '',
    },
    floor: {
      type: String,
      default: '',
    },
    building: {
      type: String,
      default: '',
    },
    coordinates: {
      x: Number,
      y: Number,
      z: Number,
    },
  },
  
  // Group Association
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
  }],
  
  // Timers
  timers: [{
    name: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['turn_on', 'turn_off', 'toggle'],
      required: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Ownership & Permissions
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    permissions: [{
      type: String,
      enum: ['view', 'control', 'configure', 'share'],
      default: 'view',
    }],
    sharedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Device Configuration
  configuration: {
    autoOff: {
      enabled: {
        type: Boolean,
        default: false,
      },
      duration: {
        type: Number, // in minutes
        default: 60,
      },
    },
    
    notifications: {
      statusChange: {
        type: Boolean,
        default: false,
      },
      energyThreshold: {
        enabled: {
          type: Boolean,
          default: false,
        },
        value: {
          type: Number,
          default: 100,
        },
      },
      maintenance: {
        type: Boolean,
        default: true,
      },
    },
    
    schedules: [{
      name: {
        type: String,
        required: true,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      triggers: [{
        type: {
          type: String,
          enum: ['time', 'sunset', 'sunrise', 'motion', 'temperature'],
          required: true,
        },
        value: mongoose.Schema.Types.Mixed,
        days: [{
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        }],
      }],
      actions: [{
        type: {
          type: String,
          enum: ['turn_on', 'turn_off', 'set_brightness', 'set_temperature', 'set_color'],
          required: true,
        },
        value: mongoose.Schema.Types.Mixed,
      }],
    }],
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  
  // Notes
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: '',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
deviceSchema.index({ owner: 1 });
deviceSchema.index({ type: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ powerState: 1 });
deviceSchema.index({ isOnline: 1 });
deviceSchema.index({ 'location.room': 1 });
deviceSchema.index({ groups: 1 });
deviceSchema.index({ tags: 1 });
deviceSchema.index({ createdAt: 1 });
deviceSchema.index({ lastSeen: 1 });
deviceSchema.index({ name: 'text', description: 'text', manufacturer: 'text', model: 'text' });

// Virtuals
deviceSchema.virtual('isActive').get(function() {
  return this.status === DEVICE_STATUS.ONLINE && this.isOnline;
});

deviceSchema.virtual('connectionStatus').get(function() {
  const now = new Date();
  const lastSeen = this.lastSeen;
  
  if (!lastSeen) return 'never';
  
  const diff = now - lastSeen;
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 5) return 'online';
  if (minutes < 30) return 'recently';
  if (minutes < 1440) return 'today'; // 24 hours
  return 'offline';
});

deviceSchema.virtual('activeTimers').get(function() {
  return this.timers.filter(timer => 
    timer.isActive && timer.scheduledTime > new Date()
  );
});

// Pre-save middleware
deviceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update lastSeen when device comes online
  if (this.isModified('isOnline') && this.isOnline) {
    this.lastSeen = new Date();
  }
  
  // Update status based on online status
  if (this.isModified('isOnline')) {
    this.status = this.isOnline ? DEVICE_STATUS.ONLINE : DEVICE_STATUS.OFFLINE;
  }
  
  next();
});

// Methods
deviceSchema.methods.toggle = function() {
  this.powerState = this.powerState === POWER_STATES.ON ? POWER_STATES.OFF : POWER_STATES.ON;
  return this.save();
};

deviceSchema.methods.turnOn = function() {
  this.powerState = POWER_STATES.ON;
  return this.save();
};

deviceSchema.methods.turnOff = function() {
  this.powerState = POWER_STATES.OFF;
  return this.save();
};

deviceSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  this.isOnline = true;
  return this.save();
};

deviceSchema.methods.addTimer = function(timerData) {
  this.timers.push({
    ...timerData,
    createdAt: new Date(),
  });
  return this.save();
};

deviceSchema.methods.removeTimer = function(timerId) {
  this.timers = this.timers.filter(timer => timer._id.toString() !== timerId);
  return this.save();
};

deviceSchema.methods.updateEnergyUsage = function(usage) {
  this.energy.currentUsage = usage;
  this.energy.lastUpdated = new Date();
  return this.save();
};

deviceSchema.methods.shareWith = function(userId, permissions = ['view']) {
  // Remove existing share if exists
  this.sharedWith = this.sharedWith.filter(share => 
    share.user.toString() !== userId.toString()
  );
  
  // Add new share
  this.sharedWith.push({
    user: userId,
    permissions,
    sharedAt: new Date(),
  });
  
  return this.save();
};

deviceSchema.methods.unshareWith = function(userId) {
  this.sharedWith = this.sharedWith.filter(share => 
    share.user.toString() !== userId.toString()
  );
  return this.save();
};

// Static methods
deviceSchema.statics.findByOwner = function(ownerId) {
  return this.find({ owner: ownerId });
};

deviceSchema.statics.findByType = function(type) {
  return this.find({ type });
};

deviceSchema.statics.findOnline = function() {
  return this.find({ isOnline: true });
};

deviceSchema.statics.findByRoom = function(room) {
  return this.find({ 'location.room': room });
};

deviceSchema.statics.searchDevices = function(query, ownerId) {
  const searchCriteria = {
    owner: ownerId,
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { manufacturer: { $regex: query, $options: 'i' } },
      { model: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ],
  };
  
  return this.find(searchCriteria);
};

// Create and export model
const Device = mongoose.model('Device', deviceSchema);

export default Device;
