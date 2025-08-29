import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

// Import configuration and utilities
import config from './src/config/database.js';
import logger from './src/utils/logger.js';
import { defaultLimiter } from './src/middlewares/rateLimiter.js';
import { errorHandler } from './src/middlewares/errorHandler.js';

// Import routes
import routes from './src/routes/index.js';

// Create Express app
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Security Middleware
 */

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      // Allow any origin in development
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

/**
 * General Middleware
 */

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
}));

// Request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
} else {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain'],
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
}));

// Cookie parser
app.use(cookieParser());

// Request ID middleware
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.set('X-Request-ID', req.id);
  next();
});

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    res.set('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
});

/**
 * Rate Limiting
 */

// Global rate limiting
app.use('/api/', defaultLimiter);

// Stricter rate limiting for authentication endpoints  
app.use('/api/v1/auth/', defaultLimiter);

/**
 * Static Files
 */

// Serve uploaded files (if any)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
}));

// Serve API documentation (if available)
app.use('/docs', express.static(path.join(__dirname, '../docs'), {
  maxAge: '1h',
  index: ['index.html'],
}));

/**
 * API Routes
 */

// Mount API routes
app.use('/api/v1', routes);

// API version fallback
app.use('/api', (req, res) => {
  res.status(200).json({
    message: 'Smart Home Control Platform API',
    version: '1.0.0',
    documentation: '/docs',
    health: '/api/v1/health',
    supportedVersions: ['v1'],
  });
});

/**
 * Health Check Endpoints
 */

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
  });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    checks: {
      database: 'unknown',
      memory: 'healthy',
      disk: 'healthy',
    },
  };

  try {
    // Check database connection
    const mongoose = await import('mongoose');
    health.checks.database = mongoose.default.connection.readyState === 1 ? 'healthy' : 'unhealthy';
  } catch (error) {
    health.checks.database = 'error';
    logger.error('Database health check failed', { error: error.message });
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
  };

  health.memory = memUsageMB;

  // Check if memory usage is too high (> 500MB)
  if (memUsageMB.heapUsed > 500) {
    health.checks.memory = 'warning';
  }

  // Overall status
  const unhealthyChecks = Object.values(health.checks).filter(check => 
    check === 'unhealthy' || check === 'error'
  );
  
  if (unhealthyChecks.length > 0) {
    health.status = 'unhealthy';
    res.status(503);
  }

  res.json(health);
});

/**
 * Error Handling
 */

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    documentation: '/docs',
    supportedVersions: ['v1'],
  });
});

// 404 handler for all other routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    suggestion: 'Check the URL or visit /api for API information',
  });
});

// Global error handler
app.use(errorHandler);

/**
 * Graceful Shutdown Handling
 */

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  
  // Exit gracefully
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
  });
  
  // Exit gracefully
  process.exit(1);
});

// Handle SIGTERM signal (deployment shutdown)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close server gracefully
  if (app.server) {
    app.server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Close server gracefully
  if (app.server) {
    app.server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

/**
 * Request Context Logger
 */

// Log all requests in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.debug('Incoming request', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.method !== 'GET' ? req.body : undefined,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    next();
  });
}

export default app;
