const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

// All booking routes require authentication
router.use(protect);

// Get all bookings (filtered by user role)
router.get('/', bookingController.getAllBookings);

// Show booking form - This must come before /:id route
router.get('/new', bookingController.showBookingForm);

// Get booking by ID
router.get('/:id', bookingController.getBookingById);

// Create new booking
router.post('/', bookingController.createBooking);

// Cancel booking
router.post('/:id/cancel', bookingController.cancelBooking);

module.exports = router; 