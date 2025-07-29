const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Bus = sequelize.define('Bus', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    busNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    busName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    source: {
        type: DataTypes.STRING,
        allowNull: false
    },
    destination: {
        type: DataTypes.STRING,
        allowNull: false
    },
    departureTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    arrivalTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    totalSeats: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 40
    },
    seatLayout: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        validate: {
            isValidSeatLayout(value) {
                // Accept empty objects for new buses
                if (typeof value === 'string') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        throw new Error('Invalid seat layout format');
                    }
                }
                
                if (Object.keys(value).length === 0) {
                    return; // Empty layout is valid for new buses
                }
                
                // For non-empty layouts, validate each seat
                for (const seatNumber in value) {
                    const seat = value[seatNumber];
                    // Support both simplified and detailed formats
                    if (typeof seat === 'string') {
                        if (!['available', 'booked', 'blocked'].includes(seat)) {
                            throw new Error(`Invalid status for seat ${seatNumber}`);
                        }
                    } else if (typeof seat === 'object') {
                        if (!seat.hasOwnProperty('status')) {
                            throw new Error(`Seat ${seatNumber} must have a status property`);
                        }
                        if (!['available', 'booked', 'blocked'].includes(seat.status)) {
                            throw new Error(`Invalid status for seat ${seatNumber}`);
                        }
                    } else {
                        throw new Error(`Invalid format for seat ${seatNumber}`);
                    }
                }
            }
        }
    },
    fare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    busType: {
        type: DataTypes.ENUM('AC', 'Non-AC', 'Sleeper', 'Semi-Sleeper'),
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    validate: {
        arrivalAfterDeparture() {
            if (this.arrivalTime <= this.departureTime) {
                throw new Error('Arrival time must be after departure time');
            }
        }
    },
    hooks: {
        beforeCreate: (bus) => {
            // Initialize seat layout if not provided
            const emptyLayout = !bus.seatLayout || 
                (typeof bus.seatLayout === 'object' && Object.keys(bus.seatLayout).length === 0) ||
                (typeof bus.seatLayout === 'string' && bus.seatLayout === '{}');
                
            if (emptyLayout) {
                const layout = {};
                for (let i = 1; i <= bus.totalSeats; i++) {
                    // Use simpler format for better compatibility
                    layout[i] = 'available';
                }
                bus.seatLayout = layout;
            }
        }
    }
});

// Instance method to get available seats
Bus.prototype.getAvailableSeats = function() {
    const seatLayout = typeof this.seatLayout === 'string' 
        ? JSON.parse(this.seatLayout) 
        : this.seatLayout;
    
    return Object.entries(seatLayout)
        .filter(([_, seat]) => {
            if (typeof seat === 'string') {
                return seat === 'available';
            } else if (typeof seat === 'object') {
                return seat.status === 'available';
            }
            return false;
        })
        .map(([seatNumber]) => parseInt(seatNumber));
};

// Instance method to check if seats are available
Bus.prototype.areSeatsAvailable = function(seatNumbers) {
    const seatLayout = typeof this.seatLayout === 'string' 
        ? JSON.parse(this.seatLayout) 
        : this.seatLayout;

    return seatNumbers.every(seatNumber => {
        const seat = seatLayout[seatNumber];
        if (!seat) return false;
        
        if (typeof seat === 'string') {
            return seat === 'available';
        } else if (typeof seat === 'object') {
            return seat.status === 'available';
        }
        return false;
    });
};

// Instance method to block seats
Bus.prototype.blockSeats = function(seatNumbers) {
    const seatLayout = typeof this.seatLayout === 'string' 
        ? JSON.parse(this.seatLayout) 
        : {...this.seatLayout};

    seatNumbers.forEach(seatNumber => {
        if (seatLayout[seatNumber]) {
            if (typeof seatLayout[seatNumber] === 'string') {
                seatLayout[seatNumber] = 'blocked';
            } else if (typeof seatLayout[seatNumber] === 'object') {
                seatLayout[seatNumber].status = 'blocked';
            }
        }
    });
    
    this.seatLayout = seatLayout;
    return this.save();
};

// Instance method to book seats
Bus.prototype.bookSeats = function(seatNumbers) {
    const seatLayout = typeof this.seatLayout === 'string' 
        ? JSON.parse(this.seatLayout) 
        : {...this.seatLayout};

    seatNumbers.forEach(seatNumber => {
        if (seatLayout[seatNumber]) {
            if (typeof seatLayout[seatNumber] === 'string') {
                seatLayout[seatNumber] = 'booked';
            } else if (typeof seatLayout[seatNumber] === 'object') {
                seatLayout[seatNumber].status = 'booked';
            }
        }
    });
    
    this.seatLayout = seatLayout;
    return this.save();
};

// Instance method to unblock seats
Bus.prototype.unblockSeats = function(seatNumbers) {
    const seatLayout = typeof this.seatLayout === 'string' 
        ? JSON.parse(this.seatLayout) 
        : {...this.seatLayout};

    seatNumbers.forEach(seatNumber => {
        if (seatLayout[seatNumber]) {
            if (typeof seatLayout[seatNumber] === 'string') {
                seatLayout[seatNumber] = 'available';
            } else if (typeof seatLayout[seatNumber] === 'object') {
                seatLayout[seatNumber].status = 'available';
            }
        }
    });
    
    this.seatLayout = seatLayout;
    return this.save();
};

module.exports = { Bus }; 