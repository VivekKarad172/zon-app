const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProcessRecord = sequelize.define('ProcessRecord', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // FKs: productionUnitId, workerId

    stage: {
        type: DataTypes.ENUM('PVC_CUT', 'FOIL_PASTING', 'EMBOSS', 'DOOR_MAKING', 'PACKING'),
        allowNull: false
    },

    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

module.exports = ProcessRecord;
