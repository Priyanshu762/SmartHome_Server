import bcrypt from 'bcryptjs';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Password and hashing utility functions
 * Provides secure password hashing and comparison using bcrypt
 */

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export const hashPassword = async (password) => {
  try {
    if (!password) {
      throw new Error('Password is required');
    }

    if (typeof password !== 'string') {
      throw new Error('Password must be a string');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const saltRounds = config.security.bcryptSaltRounds;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    logger.debug('Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw error;
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match
 */
export const comparePassword = async (password, hashedPassword) => {
  try {
    if (!password || !hashedPassword) {
      throw new Error('Password and hashed password are required');
    }

    if (typeof password !== 'string' || typeof hashedPassword !== 'string') {
      throw new Error('Password and hashed password must be strings');
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);
    
    logger.debug('Password comparison completed', { isMatch });
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password:', error);
    throw error;
  }
};

/**
 * Validate password strength
 * @param {string} password - Plain text password
 * @returns {Object} - Validation result with strength score and issues
 */
export const validatePasswordStrength = (password) => {
  const validation = {
    isValid: true,
    score: 0,
    issues: [],
    suggestions: [],
  };

  if (!password) {
    validation.isValid = false;
    validation.issues.push('Password is required');
    return validation;
  }

  if (typeof password !== 'string') {
    validation.isValid = false;
    validation.issues.push('Password must be a string');
    return validation;
  }

  // Length check
  if (password.length < 8) {
    validation.isValid = false;
    validation.issues.push('Password must be at least 8 characters long');
    validation.suggestions.push('Use at least 8 characters');
  } else {
    validation.score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    validation.issues.push('Password should contain at least one uppercase letter');
    validation.suggestions.push('Add at least one uppercase letter (A-Z)');
  } else {
    validation.score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    validation.issues.push('Password should contain at least one lowercase letter');
    validation.suggestions.push('Add at least one lowercase letter (a-z)');
  } else {
    validation.score += 1;
  }

  // Number check
  if (!/\d/.test(password)) {
    validation.issues.push('Password should contain at least one number');
    validation.suggestions.push('Add at least one number (0-9)');
  } else {
    validation.score += 1;
  }

  // Special character check
  if (!/[@$!%*?&]/.test(password)) {
    validation.issues.push('Password should contain at least one special character');
    validation.suggestions.push('Add at least one special character (@$!%*?&)');
  } else {
    validation.score += 1;
  }

  // Common patterns check
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i,
    /letmein/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      validation.issues.push('Password contains common patterns');
      validation.suggestions.push('Avoid common words and patterns');
      break;
    }
  }

  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    validation.issues.push('Password contains repeated characters');
    validation.suggestions.push('Avoid repeating the same character multiple times');
  }

  // Determine strength
  let strength = 'weak';
  if (validation.score >= 4 && validation.issues.length <= 1) {
    strength = 'strong';
  } else if (validation.score >= 3 && validation.issues.length <= 2) {
    strength = 'medium';
  }

  validation.strength = strength;
  validation.isStrong = strength === 'strong';

  return validation;
};

/**
 * Generate a random password
 * @param {number} length - Password length (default: 12)
 * @param {Object} options - Password generation options
 * @returns {string} - Generated password
 */
export const generateRandomPassword = (length = 12, options = {}) => {
  const defaults = {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSpecials: true,
    excludeSimilar: true, // Exclude similar looking characters (0, O, l, 1, etc.)
  };

  const settings = { ...defaults, ...options };

  let characters = '';
  
  if (settings.includeLowercase) {
    characters += settings.excludeSimilar ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (settings.includeUppercase) {
    characters += settings.excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (settings.includeNumbers) {
    characters += settings.excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (settings.includeSpecials) {
    characters += '@$!%*?&';
  }

  if (!characters) {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  for (let i = 0; i < length; i++) {
    password += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return password;
};

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Random hex token
 */
export const generateRandomToken = async (length = 32) => {
  try {
    const crypto = await import('crypto');
    return crypto.randomBytes(length).toString('hex');
  } catch (error) {
    logger.error('Error generating random token:', error);
    throw error;
  }
};

/**
 * Generate a numeric OTP
 * @param {number} length - OTP length (default: 6)
 * @returns {string} - Numeric OTP
 */
export const generateOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

/**
 * Hash data using SHA-256
 * @param {string} data - Data to hash
 * @returns {Promise<string>} - SHA-256 hash
 */
export const hashData = async (data) => {
  try {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch (error) {
    logger.error('Error hashing data:', error);
    throw error;
  }
};

export default {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateRandomPassword,
  generateRandomToken,
  generateOTP,
  hashData,
};
