const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SheetMaster = sequelize.define('SheetMaster', {
    width: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    height: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    materialType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PVC'
    },
    isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = SheetMaster;
