import mongoose from 'mongoose';
import { USER_ROLES } from '../config/constants.js';

/**
 * User Schema
 * Represents users in the smart home system with authentication and profile data
 */
const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
  },
  
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't include password in queries by default
  },
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  
  avatar: {
    type: String,
    default: null,
  },
  
  // Authentication
  googleId: {
    type: String,
    sparse: true,
    unique: true,
  },
  
  provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  
  isVerified: {
    type: Boolean,
    default: false,
  },
  
  verificationToken: {
    type: String,
    default: null,
    select: false,
  },
  
  passwordResetToken: {
    type: String,
    default: null,
    select: false,
  },
  
  passwordResetExpires: {
    type: Date,
    default: null,
    select: false,
  },
  
  // Authorization
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER,
  },
  
  // Token Management
  refreshTokens: [{
    token: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  }],
  
  tokenVersion: {
    type: Number,
    default: 0,
  },
  
  // Profile Information
  phone: {
    type: String,
    default: null,
  },
  
  timezone: {
    type: String,
    default: 'UTC',
  },
  
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light',
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: false,
      },
    },
    dashboard: {
      layout: {
        type: String,
        enum: ['grid', 'list'],
        default: 'grid',
      },
      autoRefresh: {
        type: Boolean,
        default: true,
      },
      refreshInterval: {
        type: Number,
        default: 30, // seconds
      },
    },
  },
  
  // Activity Tracking
  lastLoginAt: {
    type: Date,
    default: null,
  },
  
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  
  loginAttempts: {
    type: Number,
    default: 0,
  },
  
  lockUntil: {
    type: Date,
    default: null,
  },
  
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
  
  // Address (optional)
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  
  // Emergency Contact (optional)
  emergencyContact: {
    name: String,
    phone: String,
    email: String,
    relationship: String,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.verificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.tokenVersion;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.verificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.tokenVersion;
      delete ret.__v;
      return ret;
    },
  },
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ lastActiveAt: 1 });
userSchema.index({ 'refreshTokens.token': 1 });
userSchema.index({ 'refreshTokens.expiresAt': 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Virtual for profile completion percentage
userSchema.virtual('profileCompletion').get(function() {
  let completed = 0;
  const totalFields = 6;
  
  if (this.name) completed++;
  if (this.email) completed++;
  if (this.phone) completed++;
  if (this.avatar) completed++;
  if (this.address && this.address.city) completed++;
  if (this.emergencyContact && this.emergencyContact.name) completed++;
  
  return Math.round((completed / totalFields) * 100);
});

// Pre-save middleware
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
userSchema.methods.toSafeObject = function() {
  const user = this.toObject();
  delete user.password;
  delete user.refreshTokens;
  delete user.verificationToken;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.tokenVersion;
  return user;
};

userSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

userSchema.methods.addRefreshToken = function(token, expiresAt, userAgent, ipAddress) {
  // Remove expired tokens
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > new Date());
  
  // Add new token
  this.refreshTokens.push({
    token,
    expiresAt,
    userAgent,
    ipAddress,
  });
  
  // Keep only the last 5 refresh tokens per user
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return this.save();
};

userSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

userSchema.methods.clearAllRefreshTokens = function() {
  this.refreshTokens = [];
  this.tokenVersion += 1;
  return this.save();
};

userSchema.methods.incrementLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 }; // 30 minutes
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByGoogleId = function(googleId) {
  return this.findOne({ googleId });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

userSchema.statics.findAdmins = function() {
  return this.find({ role: USER_ROLES.ADMIN, isActive: true });
};

// Create and export model
const User = mongoose.model('User', userSchema);

export default User;
