const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true // Null if targeting a Role broadly
    },
    targetRole: {
        type: DataTypes.STRING,
        allowNull: true // e.g., 'MANUFACTURER', 'DISTRIBUTOR'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'INFO' // INFO, SUCCESS, WARNING, ALERT
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    orderId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = Notification;
