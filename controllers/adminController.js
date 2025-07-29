const { User, Bus, Booking } = require('../models');

exports.getDashboard = async (req, res) => {
    try {
        const [users, buses, bookings] = await Promise.all([
            User.findAll(),
            Bus.findAll(),
            Booking.findAll({
                include: [
                    { model: User, attributes: ['firstName', 'lastName'] },
                    { model: Bus, attributes: ['busName'] }
                ],
                order: [['createdAt', 'DESC']]
            })
        ]);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            users,
            buses,
            bookings
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        req.flash('error', 'Error loading dashboard data');
        res.redirect('/admin');
    }
};

exports.getBuses = async (req, res) => {
    try {
        const buses = await Bus.findAll();
        res.render('admin/buses', {
            title: 'Manage Buses',
            buses
        });
    } catch (error) {
        console.error('Error fetching buses:', error);
        req.flash('error', 'Error loading buses');
        res.redirect('/admin');
    }
};

exports.createBus = async (req, res) => {
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
            busType
        } = req.body;

        await Bus.create({
            busNumber,
            busName,
            source,
            destination,
            departureTime,
            arrivalTime,
            totalSeats,
            fare,
            busType,
            isActive: true
        });

        req.flash('success', 'Bus added successfully');
        res.redirect('/admin/buses');
    } catch (error) {
        console.error('Error creating bus:', error);
        req.flash('error', 'Error adding bus');
        res.redirect('/admin/buses');
    }
};

exports.updateBus = async (req, res) => {
    try {
        const { id } = req.params;
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

        await Bus.update({
            busNumber,
            busName,
            source,
            destination,
            departureTime,
            arrivalTime,
            totalSeats,
            fare,
            busType,
            isActive: isActive === 'true'
        }, {
            where: { id }
        });

        req.flash('success', 'Bus updated successfully');
        res.redirect('/admin/buses');
    } catch (error) {
        console.error('Error updating bus:', error);
        req.flash('error', 'Error updating bus');
        res.redirect('/admin/buses');
    }
};

exports.deleteBus = async (req, res) => {
    try {
        const { id } = req.params;
        await Bus.destroy({ where: { id } });
        req.flash('success', 'Bus deleted successfully');
        res.redirect('/admin/buses');
    } catch (error) {
        console.error('Error deleting bus:', error);
        req.flash('error', 'Error deleting bus');
        res.redirect('/admin/buses');
    }
}; 