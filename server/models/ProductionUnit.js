const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProductionUnit = sequelize.define('ProductionUnit', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // FK to OrderItem defined in index.js

    unitNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Sequential number of this unit within the line item (e.g. 1 of 5)'
    },

    uniqueCode: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },

    currentStage: {
        type: DataTypes.ENUM('PVC_CUT', 'FOIL_PASTING', 'EMBOSS', 'DOOR_MAKING', 'PACKING', 'COMPLETED'),
        defaultValue: 'PVC_CUT',
        allowNull: false
    },

    isBlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'If true, indicates an issue/hold on this specific door'
    }
});

module.exports = ProductionUnit;
