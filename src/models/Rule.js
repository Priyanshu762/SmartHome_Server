import mongoose from 'mongoose';
import { RULE_TYPES, RULE_CONDITIONS, RULE_ACTIONS } from '../config/constants.js';

/**
 * Rule Schema
 * Represents automation rules for smart home devices with conditions and actions
 */
const ruleSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true,
    maxlength: [100, 'Rule name cannot exceed 100 characters'],
  },
  
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  
  type: {
    type: String,
    enum: Object.values(RULE_TYPES),
    required: [true, 'Rule type is required'],
  },
  
  // Rule Logic
  conditions: [{
    type: {
      type: String,
      enum: Object.values(RULE_CONDITIONS),
      required: true,
    },
    
    operator: {
      type: String,
      enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'contains', 'starts_with', 'ends_with'],
      required: true,
    },
    
    // Source of the condition (device, sensor, time, etc.)
    source: {
      type: {
        type: String,
        enum: ['device', 'group', 'sensor', 'time', 'weather', 'location', 'user'],
        required: true,
      },
      
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'conditions.source.type',
      },
      
      property: {
        type: String, // e.g., 'powerState', 'temperature', 'brightness'
      },
    },
    
    value: mongoose.Schema.Types.Mixed,
    
    // For time-based conditions
    timeRange: {
      start: {
        type: String, // Format: "HH:MM"
        validate: {
          validator: function(v) {
            return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Invalid time format (use HH:MM)',
        },
      },
      end: {
        type: String, // Format: "HH:MM"
        validate: {
          validator: function(v) {
            return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Invalid time format (use HH:MM)',
        },
      },
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      }],
    },
    
    // For location-based conditions
    location: {
      latitude: Number,
      longitude: Number,
      radius: Number, // in meters
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  
  // Rule logic operator (AND/OR)
  conditionLogic: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND',
  },
  
  actions: [{
    type: {
      type: String,
      enum: Object.values(RULE_ACTIONS),
      required: true,
    },
    
    // Target of the action
    target: {
      type: {
        type: String,
        enum: ['device', 'group', 'mode', 'notification', 'webhook'],
        required: true,
      },
      
      id: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'actions.target.type',
      },
      
      // For multiple targets
      ids: [{
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'actions.target.type',
      }],
    },
    
    value: mongoose.Schema.Types.Mixed,
    
    // Delay before executing action (in seconds)
    delay: {
      type: Number,
      min: [0, 'Delay cannot be negative'],
      default: 0,
    },
    
    // Notification specific settings
    notification: {
      message: {
        type: String,
        maxlength: [200, 'Notification message cannot exceed 200 characters'],
      },
      recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
      channels: [{
        type: String,
        enum: ['email', 'push', 'sms'],
        default: 'push',
      }],
    },
    
    // Webhook specific settings
    webhook: {
      url: {
        type: String,
        validate: {
          validator: function(v) {
            return !v || /^https?:\/\/.+/.test(v);
          },
          message: 'Invalid webhook URL',
        },
      },
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE'],
        default: 'POST',
      },
      headers: {
        type: Map,
        of: String,
      },
      payload: mongoose.Schema.Types.Mixed,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  
  // Rule Triggers
  triggers: [{
    type: {
      type: String,
      enum: ['immediate', 'scheduled', 'event', 'webhook'],
      required: true,
    },
    
    // For scheduled triggers
    schedule: {
      type: {
        type: String,
        enum: ['once', 'daily', 'weekly', 'monthly', 'cron'],
      },
      
      time: {
        type: String, // Format: "HH:MM"
        validate: {
          validator: function(v) {
            return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: 'Invalid time format (use HH:MM)',
        },
      },
      
      date: Date,
      
      days: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      }],
      
      cronExpression: {
        type: String,
        validate: {
          validator: function(v) {
            // Basic cron validation (5 or 6 fields)
            return !v || /^(\*|[0-9,-\/]+)\s+(\*|[0-9,-\/]+)\s+(\*|[0-9,-\/]+)\s+(\*|[0-9,-\/]+)\s+(\*|[0-9,-\/]+)(\s+(\*|[0-9,-\/]+))?$/.test(v);
          },
          message: 'Invalid cron expression',
        },
      },
    },
    
    // For event triggers
    event: {
      source: {
        type: String,
        enum: ['device', 'group', 'user', 'system'],
      },
      name: String, // e.g., 'device_state_change', 'user_location_change'
      filters: mongoose.Schema.Types.Mixed,
    },
    
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  
  // Rule Status and Control
  isActive: {
    type: Boolean,
    default: true,
  },
  
  isRunning: {
    type: Boolean,
    default: false,
  },
  
  priority: {
    type: Number,
    min: [1, 'Priority must be between 1 and 10'],
    max: [10, 'Priority must be between 1 and 10'],
    default: 5,
  },
  
  // Execution Settings
  settings: {
    maxExecutionsPerDay: {
      type: Number,
      min: [1, 'Max executions must be at least 1'],
      default: 100,
    },
    
    cooldownPeriod: {
      type: Number, // in seconds
      min: [0, 'Cooldown period cannot be negative'],
      default: 0,
    },
    
    retryOnFailure: {
      enabled: {
        type: Boolean,
        default: false,
      },
      maxAttempts: {
        type: Number,
        min: [1, 'Max attempts must be at least 1'],
        max: [5, 'Max attempts cannot exceed 5'],
        default: 3,
      },
      retryDelay: {
        type: Number, // in seconds
        min: [1, 'Retry delay must be at least 1 second'],
        default: 60,
      },
    },
    
    executeOnlyWhenHome: {
      type: Boolean,
      default: false,
    },
    
    executeOnlyWhenAway: {
      type: Boolean,
      default: false,
    },
  },
  
  // Execution History and Statistics
  statistics: {
    executionCount: {
      type: Number,
      default: 0,
    },
    
    successCount: {
      type: Number,
      default: 0,
    },
    
    failureCount: {
      type: Number,
      default: 0,
    },
    
    lastExecuted: {
      type: Date,
      default: null,
    },
    
    lastSuccess: {
      type: Date,
      default: null,
    },
    
    lastFailure: {
      type: Date,
      default: null,
    },
    
    averageExecutionTime: {
      type: Number, // in milliseconds
      default: 0,
    },
    
    executionsToday: {
      type: Number,
      default: 0,
    },
    
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
  },
  
  // Execution Log (keep only recent entries)
  executionLog: [{
    timestamp: {
      type: Date,
      default: Date.now,
    },
    
    status: {
      type: String,
      enum: ['success', 'failure', 'partial'],
      required: true,
    },
    
    duration: {
      type: Number, // in milliseconds
    },
    
    triggeredBy: {
      type: String,
      enum: ['schedule', 'event', 'manual', 'webhook'],
    },
    
    conditionsEvaluated: [{
      condition: mongoose.Schema.Types.Mixed,
      result: Boolean,
    }],
    
    actionsExecuted: [{
      action: mongoose.Schema.Types.Mixed,
      result: {
        status: {
          type: String,
          enum: ['success', 'failure'],
        },
        message: String,
      },
    }],
    
    error: {
      type: String,
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
      enum: ['view', 'edit', 'execute', 'delete'],
      default: 'view',
    }],
    sharedAt: {
      type: Date,
      default: Date.now,
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
ruleSchema.index({ owner: 1 });
ruleSchema.index({ type: 1 });
ruleSchema.index({ isActive: 1 });
ruleSchema.index({ priority: 1 });
ruleSchema.index({ 'conditions.source.id': 1 });
ruleSchema.index({ 'actions.target.id': 1 });
ruleSchema.index({ 'triggers.schedule.time': 1 });
ruleSchema.index({ 'statistics.lastExecuted': 1 });
ruleSchema.index({ tags: 1 });
ruleSchema.index({ createdAt: 1 });
ruleSchema.index({ name: 'text', description: 'text' });

// Virtuals
ruleSchema.virtual('successRate').get(function() {
  if (this.statistics.executionCount === 0) return 0;
  return (this.statistics.successCount / this.statistics.executionCount) * 100;
});

ruleSchema.virtual('recentExecutions').get(function() {
  // Return executions from last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.executionLog.filter(log => log.timestamp > yesterday);
});

ruleSchema.virtual('activeConditions').get(function() {
  return this.conditions.filter(condition => condition.isActive);
});

ruleSchema.virtual('activeActions').get(function() {
  return this.actions.filter(action => action.isActive);
});

ruleSchema.virtual('activeTriggers').get(function() {
  return this.triggers.filter(trigger => trigger.isActive);
});

// Pre-save middleware
ruleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Reset daily execution count if needed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (this.statistics.lastResetDate < today) {
    this.statistics.executionsToday = 0;
    this.statistics.lastResetDate = today;
  }
  
  // Limit execution log to last 100 entries
  if (this.executionLog.length > 100) {
    this.executionLog = this.executionLog.slice(-100);
  }
  
  next();
});

// Methods
ruleSchema.methods.addExecutionLog = function(logEntry) {
  this.executionLog.push(logEntry);
  
  // Update statistics
  this.statistics.executionCount += 1;
  this.statistics.executionsToday += 1;
  this.statistics.lastExecuted = new Date();
  
  if (logEntry.status === 'success') {
    this.statistics.successCount += 1;
    this.statistics.lastSuccess = new Date();
  } else {
    this.statistics.failureCount += 1;
    this.statistics.lastFailure = new Date();
  }
  
  // Update average execution time
  if (logEntry.duration) {
    const totalTime = this.statistics.averageExecutionTime * (this.statistics.executionCount - 1);
    this.statistics.averageExecutionTime = (totalTime + logEntry.duration) / this.statistics.executionCount;
  }
  
  return this.save();
};

ruleSchema.methods.addCondition = function(conditionData) {
  this.conditions.push(conditionData);
  return this.save();
};

ruleSchema.methods.removeCondition = function(conditionId) {
  this.conditions = this.conditions.filter(
    c => c._id.toString() !== conditionId.toString()
  );
  return this.save();
};

ruleSchema.methods.addAction = function(actionData) {
  this.actions.push(actionData);
  return this.save();
};

ruleSchema.methods.removeAction = function(actionId) {
  this.actions = this.actions.filter(
    a => a._id.toString() !== actionId.toString()
  );
  return this.save();
};

ruleSchema.methods.addTrigger = function(triggerData) {
  this.triggers.push(triggerData);
  return this.save();
};

ruleSchema.methods.removeTrigger = function(triggerId) {
  this.triggers = this.triggers.filter(
    t => t._id.toString() !== triggerId.toString()
  );
  return this.save();
};

ruleSchema.methods.shareWith = function(userId, permissions = ['view']) {
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

ruleSchema.methods.unshareWith = function(userId) {
  this.sharedWith = this.sharedWith.filter(share => 
    share.user.toString() !== userId.toString()
  );
  return this.save();
};

ruleSchema.methods.canExecute = function() {
  if (!this.isActive) return false;
  if (this.isRunning) return false;
  if (this.statistics.executionsToday >= this.settings.maxExecutionsPerDay) return false;
  
  // Check cooldown period
  if (this.settings.cooldownPeriod > 0 && this.statistics.lastExecuted) {
    const cooldownEnd = new Date(this.statistics.lastExecuted.getTime() + this.settings.cooldownPeriod * 1000);
    if (new Date() < cooldownEnd) return false;
  }
  
  return true;
};

ruleSchema.methods.resetStatistics = function() {
  this.statistics = {
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    lastExecuted: null,
    lastSuccess: null,
    lastFailure: null,
    averageExecutionTime: 0,
    executionsToday: 0,
    lastResetDate: new Date(),
  };
  
  this.executionLog = [];
  
  return this.save();
};

// Static methods
ruleSchema.statics.findByOwner = function(ownerId) {
  return this.find({ owner: ownerId });
};

ruleSchema.statics.findActiveRules = function(ownerId) {
  return this.find({ owner: ownerId, isActive: true });
};

ruleSchema.statics.findByType = function(type) {
  return this.find({ type });
};

ruleSchema.statics.findScheduledRules = function() {
  return this.find({
    isActive: true,
    'triggers.type': 'scheduled',
    'triggers.isActive': true,
  });
};

ruleSchema.statics.findByDevice = function(deviceId) {
  return this.find({
    $or: [
      { 'conditions.source.id': deviceId },
      { 'actions.target.id': deviceId },
    ],
  });
};

ruleSchema.statics.findByGroup = function(groupId) {
  return this.find({
    $or: [
      { 'conditions.source.id': groupId },
      { 'actions.target.id': groupId },
    ],
  });
};

ruleSchema.statics.searchRules = function(query, ownerId) {
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
const Rule = mongoose.model('Rule', ruleSchema);

export default Rule;
