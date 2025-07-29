const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    busId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Buses',
            key: 'id'
        }
    },
    bookingDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    travelDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    seatDetails: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
            isValidSeatDetails(value) {
                if (!Array.isArray(value)) {
                    throw new Error('Seat details must be an array');
                }
                value.forEach(seat => {
                    if (!seat.seatNumber || !seat.seatType || !seat.price) {
                        throw new Error('Each seat must have seatNumber, seatType, and price');
                    }
                });
            }
        }
    },
    totalSeats: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1
        }
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
        defaultValue: 'pending'
    },
    paymentId: {
        type: DataTypes.STRING,
        unique: true
    },
    paymentStatus: {
        type: DataTypes.ENUM('pending', 'completed', 'failed'),
        defaultValue: 'pending'
    },
    cancellationReason: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    hooks: {
        beforeCreate: async (booking) => {
            // Calculate total seats and amount from seatDetails
            booking.totalSeats = booking.seatDetails.length;
            booking.totalAmount = booking.seatDetails.reduce((sum, seat) => sum + parseFloat(seat.price), 0);
        },
        afterCreate: async (booking) => {
            // Update bus seat status to 'booked' after successful booking
            const bus = await booking.getBus();
            if (bus) {
                const seatNumbers = booking.seatDetails.map(seat => seat.seatNumber);
                await bus.bookSeats(seatNumbers);
            }
        },
        beforeUpdate: async (booking) => {
            // If booking is being cancelled
            if (booking.changed('status') && booking.status === 'cancelled') {
                booking.cancelledAt = new Date();
                
                // Release the seats back to available
                const bus = await booking.getBus();
                if (bus) {
                    const seatNumbers = booking.seatDetails.map(seat => seat.seatNumber);
                    await bus.unblockSeats(seatNumbers);
                }
            }
        }
    }
});

// Instance method to get booking summary
Booking.prototype.getBookingSummary = function() {
    return {
        bookingId: this.id,
        busDetails: {
            busId: this.busId,
            // Add bus name and other details when needed
        },
        travelDate: this.travelDate,
        seats: this.seatDetails.map(seat => ({
            seatNumber: seat.seatNumber,
            seatType: seat.seatType,
            price: seat.price
        })),
        totalAmount: this.totalAmount,
        status: this.status,
        paymentStatus: this.paymentStatus
    };
};

module.exports = { Booking }; 