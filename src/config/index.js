import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;

// Try to load specific environment file, fallback to .env
try {
  dotenv.config({ path: envFile });
} catch (error) {
  dotenv.config();
}

/**
 * Environment configuration object
 * Centralized configuration management for the application
 */
const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT, 10) || 3001,
    host: process.env.HOST || 'localhost',
  },
  
  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_home_dev',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/smart_home_test',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_jwt_secret_for_dev_only',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_for_dev_only',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Google OAuth Configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/google/callback',
  },
  
  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET || 'fallback_session_secret_for_dev_only',
    cookie: {
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: process.env.COOKIE_SAME_SITE || 'lax',
      httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  
  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5,
  },
  
  // Security Configuration
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  
  // Frontend Configuration
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  
  // Health Check Configuration
  health: {
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10) || 5000,
  },
};

// Validate required configuration
const requiredConfigs = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
];

if (config.isProduction) {
  requiredConfigs.push('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET');
}

const missingConfigs = requiredConfigs.filter(key => !process.env[key]);
if (missingConfigs.length > 0) {
  console.error(`Missing required environment variables: ${missingConfigs.join(', ')}`);
  if (config.isProduction) {
    process.exit(1);
  }
}

export default config;
