const { User } = require('./user');
const { Bus } = require('./bus');
const { Booking } = require('./booking');

// User-Booking relationship
User.hasMany(Booking, {
    foreignKey: 'userId',
    as: 'bookings'
});
Booking.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// Bus-Booking relationship
Bus.hasMany(Booking, {
    foreignKey: 'busId',
    as: 'bookings'
});
Booking.belongsTo(Bus, {
    foreignKey: 'busId',
    as: 'bus'
});

module.exports = {
    User,
    Bus,
    Booking
}; 