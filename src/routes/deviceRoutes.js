import express from 'express';
import { deviceController } from '../controllers/index.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { deviceControlLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply authentication to all device routes
router.use(authenticate);

// Apply rate limiting
router.use(deviceControlLimiter);

/**
 * @route   GET /api/v1/devices
 * @desc    Get user devices
 * @access  Private
 */
router.get('/', deviceController.getDevices);

/**
 * @route   POST /api/v1/devices
 * @desc    Create new device
 * @access  Private
 */
router.post('/', deviceController.createDevice);

/**
 * @route   GET /api/v1/devices/statistics
 * @desc    Get device statistics
 * @access  Private
 */
router.get('/statistics', deviceController.getDeviceStatistics);

/**
 * @route   POST /api/v1/devices/discover
 * @desc    Discover devices on network
 * @access  Private
 */
router.post('/discover', deviceController.discoverDevices);

/**
 * @route   POST /api/v1/devices/bulk-control
 * @desc    Bulk control multiple devices
 * @access  Private
 */
router.post('/bulk-control', deviceController.bulkControlDevices);

/**
 * @route   GET /api/v1/devices/:deviceId
 * @desc    Get device by ID
 * @access  Private
 */
router.get('/:deviceId', deviceController.getDeviceById);

/**
 * @route   PUT /api/v1/devices/:deviceId
 * @desc    Update device
 * @access  Private
 */
router.put('/:deviceId', deviceController.updateDevice);

/**
 * @route   DELETE /api/v1/devices/:deviceId
 * @desc    Delete device
 * @access  Private
 */
router.delete('/:deviceId', deviceController.deleteDevice);

/**
 * @route   POST /api/v1/devices/:deviceId/control
 * @desc    Control device
 * @access  Private
 */
router.post('/:deviceId/control', deviceController.controlDevice);

/**
 * @route   GET /api/v1/devices/:deviceId/status
 * @desc    Get device status
 * @access  Private
 */
router.get('/:deviceId/status', deviceController.getDeviceStatus);

/**
 * @route   PUT /api/v1/devices/:deviceId/status
 * @desc    Update device status
 * @access  Private
 */
router.put('/:deviceId/status', deviceController.updateDeviceStatus);

/**
 * @route   GET /api/v1/devices/:deviceId/history
 * @desc    Get device history
 * @access  Private
 */
router.get('/:deviceId/history', deviceController.getDeviceHistory);

/**
 * @route   GET /api/v1/devices/:deviceId/capabilities
 * @desc    Get device capabilities
 * @access  Private
 */
router.get('/:deviceId/capabilities', deviceController.getDeviceCapabilities);

/**
 * @route   POST /api/v1/devices/:deviceId/test
 * @desc    Test device connection
 * @access  Private
 */
router.post('/:deviceId/test', deviceController.testDeviceConnection);

/**
 * @route   POST /api/v1/devices/:deviceId/firmware-update
 * @desc    Update device firmware
 * @access  Private
 */
router.post('/:deviceId/firmware-update', deviceController.updateDeviceFirmware);

/**
 * @route   GET /api/v1/devices/:deviceId/energy
 * @desc    Get device energy usage
 * @access  Private
 */
router.get('/:deviceId/energy', deviceController.getDeviceEnergyUsage);

/**
 * @route   POST /api/v1/devices/:deviceId/timer
 * @desc    Set device timer
 * @access  Private
 */
router.post('/:deviceId/timer', deviceController.setDeviceTimer);

/**
 * @route   GET /api/v1/devices/:deviceId/timers
 * @desc    Get device timers
 * @access  Private
 */
router.get('/:deviceId/timers', deviceController.getDeviceTimers);

/**
 * @route   DELETE /api/v1/devices/:deviceId/timers/:timerId
 * @desc    Cancel device timer
 * @access  Private
 */
router.delete('/:deviceId/timers/:timerId', deviceController.cancelDeviceTimer);

export default router;
