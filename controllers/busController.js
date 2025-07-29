const { Bus } = require('../models/bus');
const { Op } = require('sequelize');

// Get all buses with optional filtering
exports.getAllBuses = async (req, res) => {
    try {
        const { 
            source, 
            destination, 
            date, 
            busType, 
            minFare, 
            maxFare,
            page = 1,
            limit = 10
        } = req.query;

        // Build filter conditions
        const where = {
            isActive: true // Only show active buses
        };

        // Source and destination search (case-insensitive)
        if (source) {
            where.source = {
                [Op.iLike]: `%${source.trim()}%`
            };
        }
        if (destination) {
            where.destination = {
                [Op.iLike]: `%${destination.trim()}%`
            };
        }

        // Bus type filter
        if (busType) {
            where.busType = busType;
        }

        // Fare range filter
        if (minFare || maxFare) {
            where.fare = {};
            if (minFare) where.fare[Op.gte] = parseFloat(minFare);
            if (maxFare) where.fare[Op.lte] = parseFloat(maxFare);
        }

        // Date filter
        if (date) {
            const searchDate = new Date(date);
            const startOfDay = new Date(searchDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(searchDate);
            endOfDay.setHours(23, 59, 59, 999);

            where.departureTime = {
                [Op.between]: [startOfDay, endOfDay]
            };
        }

        // Get buses with pagination
        const offset = (page - 1) * limit;
        const { count, rows } = await Bus.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['departureTime', 'ASC']]
        });

        // Format the buses for display
        const formattedBuses = rows.map(bus => ({
            ...bus.toJSON(),
            formattedDepartureTime: new Date(bus.departureTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }),
            formattedArrivalTime: new Date(bus.arrivalTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        }));

        // If it's a search request (has source/destination/date), render the search page
        if (source || destination || date) {
            return res.render('search', {
                title: 'Search Results',
                buses: formattedBuses,
                source,
                destination,
                date,
                passengers: req.query.passengers || 1
            });
        }

        // Otherwise return JSON response
        res.json({
            success: true,
            count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            buses: formattedBuses
        });
    } catch (error) {
        console.error('Error fetching buses:', error);
        res.status(500).json({ message: 'Error fetching buses', error: error.message });
    }
};

// Get a single bus by ID
exports.getBusById = async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        res.json({ success: true, bus });
    } catch (error) {
        console.error('Error fetching bus:', error);
        res.status(500).json({ message: 'Error fetching bus', error: error.message });
    }
};

// Create a new bus (admin only)
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

        // Check if bus number already exists
        const existingBus = await Bus.findOne({ where: { busNumber } });
        if (existingBus) {
            return res.status(400).json({ message: 'Bus number already exists' });
        }

        // Create new bus
        const bus = await Bus.create({
            busNumber,
            busName,
            source,
            destination,
            departureTime,
            arrivalTime,
            totalSeats,
            fare,
            busType
        });

        res.status(201).json({
            success: true,
            message: 'Bus created successfully',
            bus
        });
    } catch (error) {
        console.error('Error creating bus:', error);
        res.status(500).json({ message: 'Error creating bus', error: error.message });
    }
};

// Update a bus (admin only)
exports.updateBus = async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        // Update bus fields
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

        if (busNumber) bus.busNumber = busNumber;
        if (busName) bus.busName = busName;
        if (source) bus.source = source;
        if (destination) bus.destination = destination;
        if (departureTime) bus.departureTime = departureTime;
        if (arrivalTime) bus.arrivalTime = arrivalTime;
        if (totalSeats) bus.totalSeats = totalSeats;
        if (fare) bus.fare = fare;
        if (busType) bus.busType = busType;
        if (isActive !== undefined) bus.isActive = isActive;

        await bus.save();

        res.json({
            success: true,
            message: 'Bus updated successfully',
            bus
        });
    } catch (error) {
        console.error('Error updating bus:', error);
        res.status(500).json({ message: 'Error updating bus', error: error.message });
    }
};

// Delete a bus (admin only)
exports.deleteBus = async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        // Check if bus has any bookings
        const bookings = await bus.getBookings();
        if (bookings.length > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete bus with existing bookings. Deactivate instead.' 
            });
        }

        await bus.destroy();

        res.json({
            success: true,
            message: 'Bus deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting bus:', error);
        res.status(500).json({ message: 'Error deleting bus', error: error.message });
    }
};

// Get bus seat layout
exports.getBusSeatLayout = async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        res.json({
            success: true,
            seatLayout: bus.seatLayout
        });
    } catch (error) {
        console.error('Error fetching bus seat layout:', error);
        res.status(500).json({ message: 'Error fetching bus seat layout', error: error.message });
    }
};

// Update bus seat layout (admin only)
exports.updateBusSeatLayout = async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }

        const { seatLayout } = req.body;
        
        if (!seatLayout) {
            return res.status(400).json({ message: 'Seat layout is required' });
        }

        bus.seatLayout = seatLayout;
        await bus.save();

        res.json({
            success: true,
            message: 'Bus seat layout updated successfully',
            seatLayout: bus.seatLayout
        });
    } catch (error) {
        console.error('Error updating bus seat layout:', error);
        res.status(500).json({ message: 'Error updating bus seat layout', error: error.message });
    }
};

// Search buses
exports.searchBuses = async (req, res) => {
    try {
        const { source, destination, date, passengers } = req.query;
        
        console.log('Search Parameters:', { source, destination, date, passengers });
        
        // Validate required fields
        if (!source || !destination || !date) {
            console.log('Missing required fields:', { source, destination, date });
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ error: 'Please provide source, destination, and date for search' });
            }
            req.flash('error_msg', 'Please provide source, destination, and date for search');
            return res.redirect('/search');
        }

        // Validate date format and ensure it's not in the past
        const searchDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        console.log('Date Validation:', {
            searchDate: searchDate.toISOString(),
            today: today.toISOString(),
            isValid: !isNaN(searchDate.getTime()),
            isFuture: searchDate >= today
        });
        
        if (isNaN(searchDate.getTime()) || searchDate < today) {
            console.log('Invalid date or past date');
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(400).json({ error: 'Please select a valid future date' });
            }
            req.flash('error_msg', 'Please select a valid future date');
            return res.redirect('/search');
        }
        
        // Build filter conditions
        const where = {
            isActive: true,
            source: { 
                [Op.iLike]: `%${source.trim()}%` 
            },
            destination: { 
                [Op.iLike]: `%${destination.trim()}%` 
            }
        };
        
        // Set date range for the search
        const startOfDay = new Date(searchDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(searchDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        where.departureTime = {
            [Op.between]: [startOfDay, endOfDay]
        };

        console.log('Search Query:', {
            where: JSON.stringify(where, null, 2),
            startOfDay: startOfDay.toISOString(),
            endOfDay: endOfDay.toISOString()
        });
        
        // Get buses
        const buses = await Bus.findAll({
            where,
            order: [['departureTime', 'ASC']]
        });
        
        console.log('Initial buses found:', buses.length);
        
        // Filter buses with enough available seats
        const filteredBuses = buses.filter(bus => {
            try {
                // Get available seats from seatLayout
                let seatLayout;
                try {
                    seatLayout = typeof bus.seatLayout === 'string' 
                        ? JSON.parse(bus.seatLayout)
                        : bus.seatLayout;
                } catch (e) {
                    console.error(`Error parsing seat layout for bus ${bus.id}:`, e);
                    seatLayout = {};
                }

                if (!seatLayout) {
                    // If no seat layout, assume all seats are available
                    return true;
                }
                
                const availableSeats = Object.values(seatLayout).filter(seat => {
                    if (typeof seat === 'string') {
                        return seat === 'available';
                    } else if (typeof seat === 'object' && seat !== null) {
                        return seat.status === 'available';
                    }
                    return false;
                }).length;
                
                // If no seats are marked in the layout, assume all seats are available
                if (availableSeats === 0 && Object.keys(seatLayout).length === 0) {
                    return true;
                }
                
                // Check if bus has enough seats for the requested number of passengers
                const requestedSeats = parseInt(passengers) || 1;
                const hasEnoughSeats = availableSeats >= requestedSeats;
                
                console.log(`Bus ${bus.id} check:`, {
                    availableSeats,
                    requestedSeats,
                    hasEnoughSeats,
                    source: bus.source,
                    destination: bus.destination,
                    departureTime: bus.departureTime,
                    totalSeats: bus.totalSeats,
                    seatLayoutEmpty: Object.keys(seatLayout).length === 0
                });
                
                return hasEnoughSeats;
            } catch (error) {
                console.error(`Error checking available seats for bus ${bus.id}:`, error);
                // If there's an error checking seats, include the bus by default
                return true;
            }
        });

        console.log('Filtered buses:', filteredBuses.length);

        // Format times for display
        const dateFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };

        filteredBuses.forEach(bus => {
            try {
                bus.formattedDepartureTime = new Date(bus.departureTime).toLocaleString('en-US', dateFormatOptions);
                bus.formattedArrivalTime = new Date(bus.arrivalTime).toLocaleString('en-US', dateFormatOptions);
            } catch (error) {
                console.error(`Error formatting times for bus ${bus.id}:`, error);
                bus.formattedDepartureTime = 'N/A';
                bus.formattedArrivalTime = 'N/A';
            }
        });

        // If no buses found, show appropriate message
        if (filteredBuses.length === 0) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({ 
                    success: false,
                    message: 'No buses found for your search criteria'
                });
            }
            req.flash('info_msg', 'No buses found for your search criteria');
        }

        // Render the search results
        res.render('search', {
            title: 'Search Results',
            user: req.session.user,
            buses: filteredBuses,
            source: source,
            destination: destination,
            date: date,
            passengers: passengers || 1
        });
    } catch (error) {
        console.error('Error searching buses:', error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({ error: 'Error searching buses' });
        }
        req.flash('error_msg', 'Error searching buses');
        res.redirect('/search');
    }
}; 