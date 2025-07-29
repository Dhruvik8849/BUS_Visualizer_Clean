const { Bus, Booking, User } = require('../models');
const { Op } = require('sequelize');

// Get all bookings (with filters for admin)
exports.getAllBookings = async (req, res) => {
    try {
        const { status, startDate, endDate, busId, userId, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        
        // Add filters if provided
        if (status) where.status = status;
        if (busId) where.busId = busId;
        if (userId) where.userId = userId;
        if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }

        // If user is not admin, only show their bookings
        if (req.user.role !== 'admin') {
            where.userId = req.user.id;
        }

        const { count, rows: bookings } = await Booking.findAndCountAll({
            where,
            include: [
                { model: Bus, as: 'bus', attributes: ['busNumber', 'source', 'destination', 'departureTime', 'arrivalTime'] },
                { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.render('bookings/index', {
            title: 'My Bookings',
            bookings,
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
            filters: req.query,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        req.flash('error', 'Error fetching bookings');
        res.redirect('/');
    }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id, {
            include: [
                { model: Bus, as: 'bus', attributes: ['busNumber', 'source', 'destination', 'departureTime', 'arrivalTime', 'fare'] },
                { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }
            ]
        });

        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/bookings');
        }

        // Check if user has permission to view this booking
        if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
            req.flash('error', 'You do not have permission to view this booking');
            return res.redirect('/bookings');
        }

        res.render('bookings/show', { 
            title: 'Booking Details',
            booking,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching booking:', error);
        req.flash('error', 'Error fetching booking details');
        res.redirect('/bookings');
    }
};

// Show booking form
exports.showBookingForm = async (req, res) => {
    try {
        const { busId, date, passengers } = req.query;
        
        if (!busId || !date || !passengers) {
            req.flash('error_msg', 'Missing required booking information');
            return res.redirect('/search');
        }

        const bus = await Bus.findByPk(busId);
        if (!bus) {
            req.flash('error_msg', 'Bus not found');
            return res.redirect('/search');
        }

        // Check if bus has available seats
        const availableSeats = bus.totalSeats - bus.bookedSeats;
        if (availableSeats < parseInt(passengers)) {
            req.flash('error_msg', 'Sorry, not enough seats available');
            return res.redirect('/search');
        }

        // Get seat layout
        const seatLayout = typeof bus.seatLayout === 'string'
            ? JSON.parse(bus.seatLayout || '{}')
            : bus.seatLayout || {};
            
        res.render('bookings/new', { 
            title: 'Book Tickets',
            bus, 
            seatLayout,
            date,
            passengers: parseInt(passengers),
            user: req.session.user
        });
    } catch (error) {
        console.error('Error showing booking form:', error);
        req.flash('error_msg', 'Error loading booking form');
        res.redirect('/search');
    }
};

// Create new booking
exports.createBooking = async (req, res) => {
    try {
        const { busId, seats, passengerDetails, travelDate } = req.body;
        
        if (!busId || !seats || !passengerDetails || !travelDate) {
            req.flash('error_msg', 'Missing required booking information');
            return res.redirect('/search');
        }

        const bus = await Bus.findByPk(busId);
        if (!bus) {
            req.flash('error_msg', 'Bus not found');
            return res.redirect('/search');
        }

        // Parse and validate seat selection
        const selectedSeats = JSON.parse(seats);
        const passengers = JSON.parse(passengerDetails);
        
        if (!Array.isArray(selectedSeats) || !Array.isArray(passengers)) {
            req.flash('error_msg', 'Invalid seat or passenger information');
            return res.redirect(`/bookings/new?busId=${busId}`);
        }

        if (selectedSeats.length !== passengers.length) {
            req.flash('error_msg', 'Number of seats and passengers must match');
            return res.redirect(`/bookings/new?busId=${busId}`);
        }

        // Validate seat availability
        const seatLayout = typeof bus.seatLayout === 'string' 
            ? JSON.parse(bus.seatLayout) 
            : bus.seatLayout;
        
        for (const seatNumber of selectedSeats) {
            const seat = seatLayout[seatNumber];
            let isBooked = false;
            
            if (typeof seat === 'string') {
                isBooked = seat === 'booked';
            } else if (typeof seat === 'object') {
                isBooked = seat.status === 'booked';
            }
            
            if (isBooked) {
                req.flash('error_msg', `Seat ${seatNumber} is already booked`);
                return res.redirect(`/bookings/new?busId=${busId}`);
            }
        }

        // Prepare seat details
        const seatDetails = selectedSeats.map((seatNumber, index) => ({
            seatNumber,
            seatType: 'standard', // You can make this dynamic based on your bus layout
            price: bus.fare,
            passengerName: passengers[index].name,
            passengerAge: passengers[index].age,
            passengerGender: passengers[index].gender
        }));

        // Create booking
        const booking = await Booking.create({
            userId: req.user.id,
            busId,
            travelDate: new Date(travelDate),
            seatDetails,
            totalSeats: selectedSeats.length,
            totalAmount: selectedSeats.length * bus.fare,
            status: 'pending'
        });

        // Update bus seat layout and booked seats count
        const updatedSeatLayout = { ...seatLayout };
        selectedSeats.forEach(seatNumber => {
            if (typeof updatedSeatLayout[seatNumber] === 'string') {
                updatedSeatLayout[seatNumber] = 'booked';
            } else if (typeof updatedSeatLayout[seatNumber] === 'object') {
                updatedSeatLayout[seatNumber].status = 'booked';
            }
        });

        bus.seatLayout = updatedSeatLayout;
        bus.bookedSeats += selectedSeats.length;
        await bus.save();

        // Redirect to payment page
        res.redirect(`/payments/checkout/${booking.id}`);
    } catch (error) {
        console.error('Error creating booking:', error);
        req.flash('error_msg', 'Error creating booking');
        res.redirect('/search');
    }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id);
        
        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/bookings');
        }

        // Check if user has permission to cancel this booking
        if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
            req.flash('error', 'You do not have permission to cancel this booking');
            return res.redirect('/bookings');
        }

        // Check if booking can be cancelled (e.g., not too close to departure)
        const bus = await Bus.findByPk(booking.busId);
        const hoursUntilDeparture = (new Date(bus.departureTime) - new Date()) / (1000 * 60 * 60);
        
        if (hoursUntilDeparture < 2) {
            req.flash('error', 'Bookings can only be cancelled at least 2 hours before departure');
            return res.redirect(`/bookings/${booking.id}`);
        }

        // Update booking status
        await booking.update({ status: 'cancelled' });

        // Update bus seat layout and booked seats count
        const seatLayout = typeof bus.seatLayout === 'string' 
            ? JSON.parse(bus.seatLayout) 
            : { ...bus.seatLayout };
            
        const bookedSeats = typeof booking.seats === 'string'
            ? JSON.parse(booking.seats)
            : booking.seats;
        
        bookedSeats.forEach(seatNumber => {
            if (typeof seatLayout[seatNumber] === 'string') {
                seatLayout[seatNumber] = 'available';
            } else if (typeof seatLayout[seatNumber] === 'object') {
                seatLayout[seatNumber].status = 'available';
            }
        });

        await bus.update({
            seatLayout: JSON.stringify(seatLayout),
            bookedSeats: bus.bookedSeats - bookedSeats.length
        });

        req.flash('success', 'Booking cancelled successfully');
        res.redirect(`/bookings/${booking.id}`);
    } catch (error) {
        console.error('Error cancelling booking:', error);
        req.flash('error', 'Error cancelling booking');
        res.redirect('/bookings');
    }
}; 