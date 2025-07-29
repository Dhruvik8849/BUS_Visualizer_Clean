const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const Booking = require('../models/booking');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Show payment form
router.get('/checkout/:bookingId', protect, paymentController.showPaymentForm);

// Process payment
router.post('/process/:bookingId', protect, paymentController.processPayment);

// Stripe webhook (no auth required)
router.post('/webhook', 
    express.raw({ type: 'application/json' }), 
    (req, res, next) => {
        const sig = req.headers['stripe-signature'];
        const rawBody = req.body;

        try {
            const event = stripe.webhooks.constructEvent(
                rawBody,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET
            );
            req.stripeEvent = event;
            next();
        } catch (err) {
            console.error('Webhook Error:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    },
    paymentController.handleWebhook
);

// Create payment intent
router.post('/create-payment-intent', protect, paymentController.createPaymentIntent);

// Handle successful payment
router.post('/success', protect, paymentController.handleSuccessfulPayment);

// Handle failed payment
router.post('/failure', protect, paymentController.handleFailedPayment);

// Payment success page
router.get('/success/:bookingId', protect, async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.bookingId, {
            include: ['bus']
        });
        
        if (!booking) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/');
        }

        res.render('payments/success', {
            title: 'Payment Successful',
            booking
        });
    } catch (error) {
        console.error('Success page error:', error);
        req.flash('error_msg', 'Error loading booking details');
        res.redirect('/');
    }
});

// Payment failure page
router.get('/failure/:bookingId', protect, async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.bookingId, {
            include: ['bus']
        });
        
        if (!booking) {
            req.flash('error_msg', 'Booking not found');
            return res.redirect('/');
        }

        res.render('payments/failure', {
            title: 'Payment Failed',
            booking
        });
    } catch (error) {
        console.error('Failure page error:', error);
        req.flash('error_msg', 'Error loading booking details');
        res.redirect('/');
    }
});

module.exports = router; 