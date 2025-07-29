const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
    res.render('index', { 
        title: 'Bus Booking System',
        user: req.session.user
    });
});

// About page route
router.get('/about', (req, res) => {
    res.render('about', { 
        title: 'About Us',
        user: req.session.user
    });
});

// Contact page route
router.get('/contact', (req, res) => {
    res.render('contact', { 
        title: 'Contact Us',
        user: req.session.user
    });
});

// Search buses route
router.get('/search', (req, res) => {
    res.render('search', { 
        title: 'Search Buses',
        user: req.session.user,
        source: req.query.source || '',
        destination: req.query.destination || '',
        date: req.query.date || '',
        passengers: req.query.passengers || 1
    });
});

module.exports = router; 