const express = require('express');
const router = express.Router();
const { User, Bus, Booking } = require('../models');
const { protect, isAdmin } = require('../middleware/auth');

// Admin dashboard - handle both / and /dashboard paths
router.get(['/', '/dashboard'], protect, isAdmin, async (req, res) => {
    try {
        const [users, buses, bookings] = await Promise.all([
            User.findAll(),
            Bus.findAll(),
            Booking.findAll({
                include: [
                    { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
                    { model: Bus, as: 'bus', attributes: ['busName', 'busNumber'] }
                ],
                order: [['createdAt', 'DESC']],
                limit: 5
            })
        ]);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            users,
            buses,
            bookings,
            messages: {
                success: res.locals.success_msg,
                error: res.locals.error_msg || res.locals.error,
                info: res.locals.info_msg,
                warning: res.locals.warning_msg
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error_msg', 'Error loading dashboard');
        res.redirect('/');
    }
});

// Bus management routes
router.get('/buses', protect, isAdmin, async (req, res) => {
    try {
        const buses = await Bus.findAll();
        res.render('admin/buses', {
            title: 'Manage Buses',
            buses,
            messages: {
                success: res.locals.success_msg,
                error: res.locals.error_msg || res.locals.error,
                info: res.locals.info_msg,
                warning: res.locals.warning_msg
            }
        });
    } catch (error) {
        console.error('Buses error:', error);
        req.flash('error_msg', 'Error loading buses');
        res.redirect('/admin');
    }
});

// Get all users (admin only)
router.get('/users', protect, isAdmin, async (req, res) => {
    console.log('Accessing user management');
    console.log('User:', req.session.user);
    try {
        const users = await User.findAll({
            attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt']
        });
        console.log('Users:', users);
        res.render('admin/users', { 
            title: 'Manage Users', 
            users,
            messages: {
                success: res.locals.success_msg,
                error: res.locals.error_msg || res.locals.error,
                info: res.locals.info_msg,
                warning: res.locals.warning_msg
            }
        });
    } catch (error) {
        console.error('Users error:', error);
        req.flash('error_msg', 'Error loading users');
        res.redirect('/admin');
    }
});

// Get all bookings (admin only)
router.get('/bookings', protect, isAdmin, async (req, res) => {
    console.log('Accessing booking management');
    console.log('User:', req.session.user);
    try {
        const bookings = await Booking.findAll({
            include: [
                { model: User, as: 'user' },
                { model: Bus, as: 'bus' }
            ],
            order: [['createdAt', 'DESC']]
        });
        console.log('Bookings:', bookings);
        res.render('admin/bookings', { 
            title: 'All Bookings', 
            bookings,
            messages: {
                success: res.locals.success_msg,
                error: res.locals.error_msg || res.locals.error,
                info: res.locals.info_msg,
                warning: res.locals.warning_msg
            }
        });
    } catch (error) {
        console.error('Bookings error:', error);
        req.flash('error_msg', 'Error loading bookings');
        res.redirect('/admin');
    }
});

router.post('/buses', protect, isAdmin, async (req, res) => {
    try {
        const {
            busNumber,
            busName,
            source,
            destination,
            departureTime,
            arrivalTime,
            totalSeats,
            fare,
            busType,
            isActive
        } = req.body;

        await Bus.create({
            busNumber,
            busName,
            source,
            destination,
            departureTime,
            arrivalTime,
            totalSeats: parseInt(totalSeats),
            fare: parseFloat(fare),
            busType,
            isActive: isActive === 'true'
        });

        req.flash('success_msg', 'Bus added successfully');
        res.redirect('/admin/buses');
    } catch (error) {
        console.error('Create bus error:', error);
        req.flash('error_msg', 'Error adding bus');
        res.redirect('/admin/buses');
    }
});

router.delete('/buses/:id', protect, isAdmin, async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }

        await bus.destroy();
        res.status(200).json({ message: 'Bus deleted successfully' });
    } catch (error) {
        console.error('Delete bus error:', error);
        res.status(500).json({ error: 'Error deleting bus' });
    }
});

// Get single bus
router.get('/buses/:id', protect, isAdmin, async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }
        res.json(bus);
    } catch (error) {
        console.error('Get bus error:', error);
        res.status(500).json({ error: 'Error fetching bus' });
    }
});

// Update bus
router.put('/buses/:id', protect, isAdmin, async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        if (!bus) {
            return res.status(404).json({ error: 'Bus not found' });
        }

        const {
            busNumber,
            busName,
            source,
            destination,
            departureTime,
            arrivalTime,
            totalSeats,
            fare,
            busType,
            isActive
        } = req.body;

        await bus.update({
            busNumber,
            busName,
            source,
            destination,
            departureTime,
            arrivalTime,
            totalSeats: parseInt(totalSeats),
            fare: parseFloat(fare),
            busType,
            isActive: isActive === 'true'
        });

        req.flash('success_msg', 'Bus updated successfully');
        res.redirect('/admin/buses');
    } catch (error) {
        console.error('Update bus error:', error);
        req.flash('error_msg', 'Error updating bus');
        res.redirect('/admin/buses');
    }
});

// Get single user
router.get('/users/:id', protect, isAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

// Update user
router.put('/users/:id', protect, isAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { firstName, lastName, email, phone, role } = req.body;

        // Check if email is being changed and if it already exists
        if (email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                req.flash('error_msg', 'Email already exists');
                return res.redirect('/admin/users');
            }
        }

        await user.update({
            firstName,
            lastName,
            email,
            phone,
            role
        });

        req.flash('success_msg', 'User updated successfully');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Update user error:', error);
        req.flash('error_msg', 'Error updating user');
        res.redirect('/admin/users');
    }
});

module.exports = router; 