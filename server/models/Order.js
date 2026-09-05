const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
    status: {
        type: DataTypes.ENUM('RECEIVED', 'PRODUCTION', 'READY', 'DISPATCHED', 'DELAYED', 'CANCELLED'),
        defaultValue: 'RECEIVED'
    },
    distributorId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    isEdited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Dealer's own reference for this order — site / party / customer name
    // (e.g. "172, Mohandeep Society, Ishvarbhai") so they can identify orders at delivery
    siteName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    // Expected ready/delivery date (auto from lead time, editable by admin)
    expectedDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Dispatch / delivery challan details (no money — logistics only)
    vehicleNo: { type: DataTypes.STRING, allowNull: true },
    transportName: { type: DataTypes.STRING, allowNull: true },
    lrNumber: { type: DataTypes.STRING, allowNull: true },
    dispatchedAt: { type: DataTypes.DATE, allowNull: true }
});

module.exports = Order;
