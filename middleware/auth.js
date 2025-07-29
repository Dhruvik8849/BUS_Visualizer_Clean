const { User } = require('../models/User');

// Middleware to protect routes
const protect = async (req, res, next) => {
    try {
        // Check if user is logged in
        if (!req.session.user) {
            req.flash('error_msg', 'Please log in to access this resource');
            return res.redirect('/auth/login');
        }

        // Get user from database
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        // Check if user is active
        if (!user.isActive) {
            req.flash('error_msg', 'Your account has been deactivated');
            req.session.destroy();
            return res.redirect('/auth/login');
        }

        // Add user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        req.flash('error_msg', 'An error occurred. Please try again');
        res.redirect('/auth/login');
    }
};

// Middleware to restrict access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.session.user || !roles.includes(req.session.user.role)) {
            req.flash('error_msg', 'You do not have permission to access this resource');
            return res.redirect('/');
        }
        next();
    };
};

// Middleware to restrict access to admin only
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        req.flash('error_msg', 'You do not have permission to access this resource');
        return res.redirect('/');
    }
    next();
};

module.exports = {
    protect,
    authorize,
    isAdmin
}; 