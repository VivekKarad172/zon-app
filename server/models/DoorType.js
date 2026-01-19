const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DoorType = sequelize.define('DoorType', {
    name: {
        type: DataTypes.STRING, // PVC, WPC
        allowNull: false
    },
    thickness: {
        type: DataTypes.STRING, // 30mm, 28mm
        allowNull: false
    },
    isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = DoorType;
