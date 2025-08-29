import mongoose from 'mongoose';
import { PERFORMANCE_MODES } from '../config/constants.js';

/**
 * Mode Schema
 * Represents performance and custom modes for smart home automation
 */
const modeSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Mode name is required'],
    trim: true,
    maxlength: [100, 'Mode name cannot exceed 100 characters'],
  },
  
  type: {
    type: String,
    enum: Object.values(PERFORMANCE_MODES),
    required: [true, 'Mode type is required'],
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  
  icon: {
    type: String,
    default: 'cog',
  },
  
  color: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Invalid hex color format',
    },
    default: '#10B981',
  },
  
  // Mode Configuration
  settings: {
    // Energy Management
    energy: {
      maxUsage: {
        type: Number,
        min: [0, 'Max usage cannot be negative'],
        default: 1000, // watts
      },
      
      priorityDevices: [{
        device: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Device',
        },
        priority: {
          type: Number,
          min: [1, 'Priority must be between 1 and 10'],
          max: [10, 'Priority must be between 1 and 10'],
          default: 5,
        },
      }],
      
      autoShutdown: {
        enabled: {
          type: Boolean,
          default: false,
        },
        threshold: {
          type: Number,
          default: 90, // percentage
        },
        excludeDevices: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Device',
        }],
      },
    },
    
    // Device Settings
    devices: [{
      device: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
        required: true,
      },
      
      powerState: {
        type: String,
        enum: ['on', 'off', 'unchanged'],
        default: 'unchanged',
      },
      
      brightness: {
        type: Number,
        min: [0, 'Brightness must be between 0 and 100'],
        max: [100, 'Brightness must be between 0 and 100'],
      },
      
      temperature: {
        type: Number,
        min: [-50, 'Temperature cannot be below -50°C'],
        max: [100, 'Temperature cannot be above 100°C'],
      },
      
      speed: {
        type: Number,
        min: [0, 'Speed must be between 0 and 100'],
        max: [100, 'Speed must be between 0 and 100'],
      },
      
      color: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
          },
          message: 'Invalid hex color format',
        },
      },
      
      customSettings: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    }],
    
    // Group Settings
    groups: [{
      group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true,
      },
      
      action: {
        type: String,
        enum: ['activate_scene', 'set_brightness', 'set_temperature', 'turn_on', 'turn_off'],
        required: true,
      },
      
      value: mongoose.Schema.Types.Mixed,
      
      sceneId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    }],
    
    // Schedule Settings
    schedule: {
      autoActivate: {
        enabled: {
          type: Boolean,
          default: false,
        },
        
        triggers: [{
          type: {
            type: String,
            enum: ['time', 'sunrise', 'sunset', 'occupancy', 'energy_usage'],
            required: true,
          },
          
          value: mongoose.Schema.Types.Mixed,
          
          days: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          }],
          
          isActive: {
            type: Boolean,
            default: true,
          },
        }],
      },
      
      autoDeactivate: {
        enabled: {
          type: Boolean,
          default: false,
        },
        
        duration: {
          type: Number, // in minutes
          min: [1, 'Duration must be at least 1 minute'],
          default: 60,
        },
        
        triggers: [{
          type: {
            type: String,
            enum: ['time', 'no_occupancy', 'energy_threshold'],
            required: true,
          },
          
          value: mongoose.Schema.Types.Mixed,
          
          isActive: {
            type: Boolean,
            default: true,
          },
        }],
      },
    },
    
    // Notification Settings
    notifications: {
      onActivation: {
        enabled: {
          type: Boolean,
          default: false,
        },
        message: {
          type: String,
          maxlength: [200, 'Message cannot exceed 200 characters'],
        },
        recipients: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        }],
      },
      
      onDeactivation: {
        enabled: {
          type: Boolean,
          default: false,
        },
        message: {
          type: String,
          maxlength: [200, 'Message cannot exceed 200 characters'],
        },
        recipients: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        }],
      },
      
      energyThreshold: {
        enabled: {
          type: Boolean,
          default: false,
        },
        threshold: {
          type: Number,
          default: 80, // percentage
        },
        message: {
          type: String,
          maxlength: [200, 'Message cannot exceed 200 characters'],
        },
      },
    },
  },
  
  // Mode Status
  isActive: {
    type: Boolean,
    default: false,
  },
  
  isSystemMode: {
    type: Boolean,
    default: false, // true for predefined system modes
  },
  
  activatedAt: {
    type: Date,
    default: null,
  },
  
  deactivatedAt: {
    type: Date,
    default: null,
  },
  
  // Usage Statistics
  statistics: {
    activationCount: {
      type: Number,
      default: 0,
    },
    
    totalActiveTime: {
      type: Number, // in minutes
      default: 0,
    },
    
    energySaved: {
      type: Number, // in kWh
      default: 0,
    },
    
    lastActivated: {
      type: Date,
      default: null,
    },
    
    averageActiveTime: {
      type: Number, // in minutes
      default: 0,
    },
  },
  
  // Ownership & Access
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
      enum: ['view', 'activate', 'edit', 'delete'],
      default: 'view',
    }],
    sharedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Conditions for auto-activation
  conditions: [{
    type: {
      type: String,
      enum: ['time_range', 'occupancy', 'energy_usage', 'weather', 'device_state'],
      required: true,
    },
    
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'between'],
      required: true,
    },
    
    value: mongoose.Schema.Types.Mixed,
    
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  
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
modeSchema.index({ owner: 1 });
modeSchema.index({ type: 1 });
modeSchema.index({ isActive: 1 });
modeSchema.index({ isSystemMode: 1 });
modeSchema.index({ 'settings.devices.device': 1 });
modeSchema.index({ 'settings.groups.group': 1 });
modeSchema.index({ tags: 1 });
modeSchema.index({ createdAt: 1 });
modeSchema.index({ name: 'text', description: 'text' });

// Ensure only one mode is active per user at a time
modeSchema.index({ owner: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Virtuals
modeSchema.virtual('deviceCount').get(function() {
  return this.settings.devices ? this.settings.devices.length : 0;
});

modeSchema.virtual('groupCount').get(function() {
  return this.settings.groups ? this.settings.groups.length : 0;
});

modeSchema.virtual('activeTime').get(function() {
  if (!this.isActive || !this.activatedAt) return 0;
  return Math.floor((new Date() - this.activatedAt) / 60000); // in minutes
});

modeSchema.virtual('energyEfficiency').get(function() {
  if (this.statistics.activationCount === 0) return 0;
  return this.statistics.energySaved / this.statistics.activationCount;
});

// Pre-save middleware
modeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate average active time
  if (this.statistics.activationCount > 0) {
    this.statistics.averageActiveTime = this.statistics.totalActiveTime / this.statistics.activationCount;
  }
  
  next();
});

// Methods
modeSchema.methods.activate = async function() {
  try {
    // Deactivate other modes for this user
    await this.constructor.updateMany(
      { owner: this.owner, _id: { $ne: this._id } },
      { 
        isActive: false,
        deactivatedAt: new Date()
      }
    );
    
    // Activate this mode
    this.isActive = true;
    this.activatedAt = new Date();
    this.statistics.activationCount += 1;
    this.statistics.lastActivated = new Date();
    
    return this.save();
  } catch (error) {
    throw error;
  }
};

modeSchema.methods.deactivate = function() {
  if (this.isActive && this.activatedAt) {
    const activeTime = Math.floor((new Date() - this.activatedAt) / 60000);
    this.statistics.totalActiveTime += activeTime;
  }
  
  this.isActive = false;
  this.deactivatedAt = new Date();
  
  return this.save();
};

modeSchema.methods.addDevice = function(deviceId, settings = {}) {
  // Remove device if already exists
  this.settings.devices = this.settings.devices.filter(
    d => d.device.toString() !== deviceId.toString()
  );
  
  // Add device with settings
  this.settings.devices.push({
    device: deviceId,
    ...settings,
  });
  
  return this.save();
};

modeSchema.methods.removeDevice = function(deviceId) {
  this.settings.devices = this.settings.devices.filter(
    d => d.device.toString() !== deviceId.toString()
  );
  
  return this.save();
};

modeSchema.methods.addGroup = function(groupId, action, value, sceneId = null) {
  // Remove group if already exists
  this.settings.groups = this.settings.groups.filter(
    g => g.group.toString() !== groupId.toString()
  );
  
  // Add group with action
  this.settings.groups.push({
    group: groupId,
    action,
    value,
    sceneId,
  });
  
  return this.save();
};

modeSchema.methods.removeGroup = function(groupId) {
  this.settings.groups = this.settings.groups.filter(
    g => g.group.toString() !== groupId.toString()
  );
  
  return this.save();
};

modeSchema.methods.addCondition = function(conditionData) {
  this.conditions.push(conditionData);
  return this.save();
};

modeSchema.methods.removeCondition = function(conditionId) {
  this.conditions = this.conditions.filter(
    c => c._id.toString() !== conditionId.toString()
  );
  return this.save();
};

modeSchema.methods.shareWith = function(userId, permissions = ['view']) {
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

modeSchema.methods.unshareWith = function(userId) {
  this.sharedWith = this.sharedWith.filter(share => 
    share.user.toString() !== userId.toString()
  );
  return this.save();
};

modeSchema.methods.updateEnergySavings = function(energySaved) {
  this.statistics.energySaved += energySaved;
  return this.save();
};

// Static methods
modeSchema.statics.findByOwner = function(ownerId) {
  return this.find({ owner: ownerId });
};

modeSchema.statics.findActiveMode = function(ownerId) {
  return this.findOne({ owner: ownerId, isActive: true });
};

modeSchema.statics.findByType = function(type) {
  return this.find({ type });
};

modeSchema.statics.findSystemModes = function() {
  return this.find({ isSystemMode: true });
};

modeSchema.statics.searchModes = function(query, ownerId) {
  const searchCriteria = {
    $or: [
      { owner: ownerId },
      { 'sharedWith.user': ownerId }
    ],
    $and: [
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { type: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } },
        ]
      }
    ]
  };
  
  return this.find(searchCriteria);
};

// Create and export model
const Mode = mongoose.model('Mode', modeSchema);

export default Mode;
