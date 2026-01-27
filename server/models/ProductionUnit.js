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

    // PARALLEL PROCESS TRACKING
    isPvcDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isFoilDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Granular Foil Tracking
    isFoilFrontDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isFoilBackDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isFoilSheetPicked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    isEmbossDone: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isDoorMade: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isPacked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    // Legacy/Computed Stage (Optional, can be Virtual field for UI if needed)
    // But for DB, we stick to flags.

    isBlocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'If true, indicates an issue/hold on this specific door'
    }
});

module.exports = ProductionUnit;
