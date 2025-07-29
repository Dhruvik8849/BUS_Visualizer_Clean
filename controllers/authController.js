const { User } = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Register a new user
exports.register = async (req, res) => {
    try {
        const { name, email, phone, password, confirmPassword } = req.body;
        console.log('Registration attempt for email:', email);

        // Check if passwords match
        if (password !== confirmPassword) {
            console.log('Passwords do not match for email:', email);
            req.flash('error_msg', 'Passwords do not match');
            return res.redirect('/auth/register');
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            console.log('Email already registered:', email);
            req.flash('error_msg', 'Email already registered');
            return res.redirect('/auth/register');
        }

        // Split name into firstName and lastName
        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        // Create new user
        const user = await User.create({
            firstName,
            lastName,
            email,
            phone,
            password,
            role: 'customer'
        });

        console.log('User created successfully:', user.email);

        // Set user in session
        req.session.user = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        };

        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                req.flash('error_msg', 'An error occurred during registration');
                return res.redirect('/auth/register');
            }
            console.log('User registered and logged in successfully:', user.email);
            req.flash('success_msg', 'Registration successful! Welcome to Bus Booking');
            res.redirect('/');
        });
    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error_msg', 'An error occurred during registration');
        res.redirect('/auth/register');
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        // Check if user exists
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('User not found with email:', email);
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Check password using the instance method
        const isMatch = await user.isValidPassword(password);
        if (!isMatch) {
            console.log('Invalid password for user:', email);
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/auth/login');
        }

        // Set user in session
        req.session.user = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        };
        
        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                req.flash('error_msg', 'An error occurred during login');
                return res.redirect('/auth/login');
            }
            console.log('User logged in successfully:', user.email);
            req.flash('success_msg', 'You are now logged in');
            res.redirect('/');
        });
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error_msg', 'An error occurred during login');
        res.redirect('/auth/login');
    }
};

// Logout user
exports.logout = (req, res) => {
    console.log('Logout attempt for user:', req.session.user ? req.session.user.email : 'unknown');
    
    // Clear user from session
    req.session.user = null;
    
    // Destroy session
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        console.log('User logged out successfully');
        res.redirect('/auth/login');
    });
};

// Show login form
exports.showLogin = (req, res) => {
    res.render('auth/login', { messages: {} });
};

// Show registration form
exports.showRegister = (req, res) => {
    res.render('auth/register', { messages: {} });
};

// Get current user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.session.user.id, {
            attributes: { exclude: ['password'] }
        });
        
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/');
        }

        res.render('users/profile', { 
            title: 'My Profile',
            user: user,
            messages: {
                success_msg: req.flash('success_msg'),
                error_msg: req.flash('error_msg')
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        req.flash('error_msg', 'Error fetching profile');
        res.redirect('/');
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body;
        
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/auth/profile');
        }

        // Update user fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.phone = phone;

        await user.save();

        // Update session
        req.session.user.firstName = user.firstName;
        req.session.user.lastName = user.lastName;

        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/auth/profile');
    } catch (error) {
        console.error('Profile update error:', error);
        req.flash('error_msg', 'Error updating profile');
        res.redirect('/auth/profile');
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New passwords do not match');
            return res.redirect('/auth/profile');
        }

        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/auth/profile');
        }

        // Verify current password
        const isMatch = await user.isValidPassword(currentPassword);
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/auth/profile');
        }

        // Update password
        user.password = newPassword;
        await user.save();

        req.flash('success_msg', 'Password updated successfully');
        res.redirect('/auth/profile');
    } catch (error) {
        console.error('Password change error:', error);
        req.flash('error_msg', 'Error changing password');
        res.redirect('/auth/profile');
    }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'No user found with this email address' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour

        // Save reset token to user
        await user.update({
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetTokenExpiry
        });

        // Create reset URL
        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${resetToken}`;

        // Email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <p>You requested a password reset</p>
                <p>Click this <a href="${resetUrl}">link</a> to reset your password</p>
                <p>If you didn't request this, please ignore this email</p>
                <p>This link will expire in 1 hour</p>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error sending password reset email' });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        // Find user with valid reset token
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
        }

        // Validate password
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update user password and clear reset token
        await user.update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        });

        res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
}; 