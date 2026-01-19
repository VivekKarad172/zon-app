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
    }
});

module.exports = Order;
