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
    },
    currentStock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    minStock: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        allowNull: false
    }
});

module.exports = SheetMaster;
