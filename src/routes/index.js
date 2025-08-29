import express from 'express';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import deviceRoutes from './deviceRoutes.js';
import groupRoutes from './groupRoutes.js';
import modeRoutes from './modeRoutes.js';
import ruleRoutes from './ruleRoutes.js';

const router = express.Router();

/**
 * API v1 Routes
 */

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Home API is running',
    timestamp: new Date(),
    version: '1.0.0',
  });
});

// Authentication routes
router.use('/auth', authRoutes);

// User management routes (admin only)
router.use('/users', userRoutes);

// Core feature routes
router.use('/devices', deviceRoutes);
router.use('/groups', groupRoutes);
router.use('/modes', modeRoutes);
router.use('/rules', ruleRoutes);

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Home Control Platform API v1',
    documentation: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      devices: '/api/v1/devices',
      groups: '/api/v1/groups',
      modes: '/api/v1/modes',
      rules: '/api/v1/rules',
    },
    features: [
      'User authentication with JWT and Google OAuth',
      'Device management and control',
      'Group and scene management',
      'Automation modes',
      'Advanced rule engine',
      'Real-time notifications',
      'Analytics and insights',
      'Energy monitoring',
    ],
  });
});

// Catch-all for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: {
      health: 'GET /api/v1/health',
      docs: 'GET /api/v1/docs',
      auth: '/api/v1/auth/*',
      users: '/api/v1/users/*',
      devices: '/api/v1/devices/*',
      groups: '/api/v1/groups/*',
      modes: '/api/v1/modes/*',
      rules: '/api/v1/rules/*',
    },
  });
});

export default router;
