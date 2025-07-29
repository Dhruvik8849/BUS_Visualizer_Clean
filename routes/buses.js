const express = require('express');
const router = express.Router();
const busController = require('../controllers/busController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', busController.getAllBuses);
router.get('/search', busController.searchBuses);
router.get('/:id', busController.getBusById);
router.get('/:id/seat-layout', busController.getBusSeatLayout);

// Admin routes
router.post('/', protect, authorize('admin'), busController.createBus);
router.put('/:id', protect, authorize('admin'), busController.updateBus);
router.delete('/:id', protect, authorize('admin'), busController.deleteBus);
router.put('/:id/seat-layout', protect, authorize('admin'), busController.updateBusSeatLayout);

module.exports = router; 