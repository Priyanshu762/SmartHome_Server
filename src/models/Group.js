import mongoose from 'mongoose';
import { GROUP_TYPES } from '../config/constants.js';

/**
 * Group Schema
 * Represents groups/rooms that organize devices in the smart home system
 */
const groupSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters'],
  },
  
  type: {
    type: String,
    enum: Object.values(GROUP_TYPES),
    required: [true, 'Group type is required'],
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  
  color: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Invalid hex color format',
    },
    default: '#3B82F6',
  },
  
  icon: {
    type: String,
    default: 'home',
  },
  
  // Location Information
  location: {
    floor: {
      type: String,
      default: '',
    },
    building: {
      type: String,
      default: '',
    },
    area: {
      type: Number, // in square meters
      min: [0, 'Area cannot be negative'],
    },
    coordinates: {
      x: Number,
      y: Number,
      z: Number,
    },
  },
  
  // Device Management
  devices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
  }],
  
  deviceLimit: {
    type: Number,
    min: [1, 'Device limit must be at least 1'],
    max: [100, 'Device limit cannot exceed 100'],
    default: 50,
  },
  
  // Group Settings
  settings: {
    autoMode: {
      enabled: {
        type: Boolean,
        default: false,
      },
      schedule: [{
        time: {
          type: String, // Format: "HH:MM"
          validate: {
            validator: function(v) {
              return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Invalid time format (use HH:MM)',
          },
        },
        action: {
          type: String,
          enum: ['turn_on', 'turn_off', 'dim', 'brighten'],
          required: true,
        },
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
    
    energyManagement: {
      enabled: {
        type: Boolean,
        default: false,
      },
      maxUsage: {
        type: Number, // in watts
        min: [0, 'Max usage cannot be negative'],
        default: 1000,
      },
      priorityDevices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
      }],
    },
    
    security: {
      motionDetection: {
        enabled: {
          type: Boolean,
          default: false,
        },
        sensitivity: {
          type: Number,
          min: [1, 'Sensitivity must be between 1 and 10'],
          max: [10, 'Sensitivity must be between 1 and 10'],
          default: 5,
        },
        notifications: {
          type: Boolean,
          default: true,
        },
      },
      
      accessControl: {
        enabled: {
          type: Boolean,
          default: false,
        },
        authorizedUsers: [{
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        }],
        requirePin: {
          type: Boolean,
          default: false,
        },
        pin: {
          type: String,
          select: false,
        },
      },
    },
    
    ambience: {
      defaultBrightness: {
        type: Number,
        min: [0, 'Brightness must be between 0 and 100'],
        max: [100, 'Brightness must be between 0 and 100'],
        default: 75,
      },
      
      defaultTemperature: {
        type: Number,
        min: [10, 'Temperature must be between 10 and 35'],
        max: [35, 'Temperature must be between 10 and 35'],
        default: 22,
      },
      
      scenes: [{
        name: {
          type: String,
          required: true,
        },
        settings: {
          brightness: Number,
          color: String,
          temperature: Number,
        },
        isActive: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      }],
    },
  },
  
  // Statistics
  statistics: {
    totalDevices: {
      type: Number,
      default: 0,
    },
    
    onlineDevices: {
      type: Number,
      default: 0,
    },
    
    totalEnergyUsage: {
      type: Number,
      default: 0,
    },
    
    lastActivity: {
      type: Date,
      default: null,
    },
    
    usage: {
      daily: {
        type: Number,
        default: 0,
      },
      weekly: {
        type: Number,
        default: 0,
      },
      monthly: {
        type: Number,
        default: 0,
      },
    },
  },
  
  // Ownership & Permissions
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
    },
    permissions: [{
      type: String,
      enum: ['view', 'control', 'configure', 'invite', 'remove_devices', 'add_devices'],
    }],
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Group Rules
  rules: [{
    name: {
      type: String,
      required: true,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
    
    conditions: [{
      type: {
        type: String,
        enum: ['time', 'device_state', 'energy_usage', 'occupancy', 'weather'],
        required: true,
      },
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'between'],
        required: true,
      },
      value: mongoose.Schema.Types.Mixed,
    }],
    
    actions: [{
      type: {
        type: String,
        enum: ['turn_on', 'turn_off', 'set_brightness', 'set_temperature', 'send_notification'],
        required: true,
      },
      target: {
        type: String,
        enum: ['all_devices', 'specific_devices', 'device_type'],
        default: 'all_devices',
      },
      devices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device',
      }],
      value: mongoose.Schema.Types.Mixed,
    }],
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
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
groupSchema.index({ owner: 1 });
groupSchema.index({ type: 1 });
groupSchema.index({ isActive: 1 });
groupSchema.index({ 'location.floor': 1 });
groupSchema.index({ 'location.building': 1 });
groupSchema.index({ devices: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ tags: 1 });
groupSchema.index({ createdAt: 1 });
groupSchema.index({ name: 'text', description: 'text' });

// Virtuals
groupSchema.virtual('deviceCount').get(function() {
  return this.devices ? this.devices.length : 0;
});

groupSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

groupSchema.virtual('activeScenes').get(function() {
  return this.settings.ambience.scenes.filter(scene => scene.isActive);
});

groupSchema.virtual('activeRules').get(function() {
  return this.rules.filter(rule => rule.isActive);
});

// Pre-save middleware
groupSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update device count
  this.statistics.totalDevices = this.devices.length;
  
  next();
});

// Pre-remove middleware
groupSchema.pre('remove', async function(next) {
  try {
    // Remove this group from all devices
    await this.model('Device').updateMany(
      { groups: this._id },
      { $pull: { groups: this._id } }
    );
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
groupSchema.methods.addDevice = function(deviceId) {
  if (!this.devices.includes(deviceId)) {
    if (this.devices.length >= this.deviceLimit) {
      throw new Error('Device limit reached for this group');
    }
    this.devices.push(deviceId);
  }
  return this.save();
};

groupSchema.methods.removeDevice = function(deviceId) {
  this.devices = this.devices.filter(id => id.toString() !== deviceId.toString());
  return this.save();
};

groupSchema.methods.addMember = function(userId, role = 'member', permissions = ['view', 'control']) {
  // Remove existing membership if exists
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  
  // Add new membership
  this.members.push({
    user: userId,
    role,
    permissions,
    joinedAt: new Date(),
  });
  
  return this.save();
};

groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  return this.save();
};

groupSchema.methods.updateMemberRole = function(userId, role, permissions) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = role;
    if (permissions) {
      member.permissions = permissions;
    }
  }
  return this.save();
};

groupSchema.methods.addScene = function(sceneData) {
  // Deactivate other scenes if this one is active
  if (sceneData.isActive) {
    this.settings.ambience.scenes.forEach(scene => {
      scene.isActive = false;
    });
  }
  
  this.settings.ambience.scenes.push({
    ...sceneData,
    createdAt: new Date(),
  });
  
  return this.save();
};

groupSchema.methods.removeScene = function(sceneId) {
  this.settings.ambience.scenes = this.settings.ambience.scenes.filter(
    scene => scene._id.toString() !== sceneId
  );
  return this.save();
};

groupSchema.methods.activateScene = function(sceneId) {
  // Deactivate all scenes
  this.settings.ambience.scenes.forEach(scene => {
    scene.isActive = scene._id.toString() === sceneId;
  });
  
  return this.save();
};

groupSchema.methods.addRule = function(ruleData) {
  this.rules.push({
    ...ruleData,
    createdAt: new Date(),
  });
  return this.save();
};

groupSchema.methods.removeRule = function(ruleId) {
  this.rules = this.rules.filter(rule => rule._id.toString() !== ruleId);
  return this.save();
};

groupSchema.methods.updateStatistics = async function() {
  try {
    // Populate devices to get current stats
    await this.populate('devices');
    
    const onlineDevices = this.devices.filter(device => device.isOnline).length;
    const totalEnergyUsage = this.devices.reduce((total, device) => 
      total + (device.energy.currentUsage || 0), 0
    );
    
    this.statistics.totalDevices = this.devices.length;
    this.statistics.onlineDevices = onlineDevices;
    this.statistics.totalEnergyUsage = totalEnergyUsage;
    this.statistics.lastActivity = new Date();
    
    return this.save();
  } catch (error) {
    throw error;
  }
};

// Static methods
groupSchema.statics.findByOwner = function(ownerId) {
  return this.find({ owner: ownerId });
};

groupSchema.statics.findByType = function(type) {
  return this.find({ type });
};

groupSchema.statics.findByMember = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ]
  });
};

groupSchema.statics.searchGroups = function(query, userId) {
  const searchCriteria = {
    $or: [
      { owner: userId },
      { 'members.user': userId }
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
const Group = mongoose.model('Group', groupSchema);

export default Group;
