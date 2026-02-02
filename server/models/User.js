const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true // Optional for Dealers (they use email)
    },
    email: { // NEW for Dealers
        type: DataTypes.STRING,
        unique: true,
        allowNull: true // Optional for Distributors/Manuf if they stick to username
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true // Optional for Dealers (Google Auth)
    },
    role: {
        type: DataTypes.ENUM('MANUFACTURER', 'DISTRIBUTOR', 'DEALER', 'MANAGER'),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    distributorId: {
        type: DataTypes.INTEGER,
        allowNull: true // Only for DEALER
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true
    },
    shopName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = User;
