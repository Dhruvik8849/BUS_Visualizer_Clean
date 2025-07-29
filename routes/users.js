const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { protect } = require('../middleware/auth');

// Add any user-specific routes here that aren't related to authentication
// For example: user preferences, user settings, etc.

// Get user profile
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findByPk(req.session.user.id, {
            attributes: { exclude: ['password'] }
        });
        res.render('users/profile', { 
            title: 'My Profile',
            user,
            messages: {
                success: req.flash('success_msg'),
                error: req.flash('error_msg')
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/');
    }
});

// Update user profile
router.post('/profile', protect, async (req, res) => {
    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/users/profile');
        }

        const { firstName, lastName, phone } = req.body;

        // Validate phone number format (10-15 digits)
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!phoneRegex.test(phone)) {
            req.flash('error_msg', 'Phone number must be between 10 and 15 digits');
            return res.redirect('/users/profile');
        }

        await user.update({
            firstName,
            lastName,
            phone
        });

        // Update session user data
        req.session.user = {
            ...req.session.user,
            firstName,
            lastName,
            phone
        };

        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/users/profile');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error_msg', 'Error updating profile');
        res.redirect('/users/profile');
    }
});

module.exports = router; 