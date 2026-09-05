const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RoleWhitelist = sequelize.define('RoleWhitelist', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    role: {
        type: DataTypes.ENUM('MANUFACTURER', 'DISTRIBUTOR', 'DEALER', 'MANAGER', 'WORKER'),
        allowNull: false
    },
    label: {
        type: DataTypes.STRING,
        allowNull: true // Optional friendly name like "Vivek - Admin"
    }
});

module.exports = RoleWhitelist;
