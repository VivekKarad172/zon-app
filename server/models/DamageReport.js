const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * DamageReport — logs a damaged / rejected / returned door.
 *  - PRODUCTION_REJECT: failed during manufacturing (foil bubble, crack, wrong size…)
 *  - DELIVERY_RETURN:   delivered but returned by the dealer (defect/complaint)
 *
 * status:
 *  - LOGGED:      recorded, not yet handled
 *  - REPLACED:    replacement doors pushed back into production
 *  - WRITTEN_OFF: scrapped, no replacement
 */
const DamageReport = sequelize.define('DamageReport', {
    orderId: { type: DataTypes.INTEGER, allowNull: true },
    orderItemId: { type: DataTypes.INTEGER, allowNull: true },
    designName: { type: DataTypes.STRING, allowNull: true },
    colorName: { type: DataTypes.STRING, allowNull: true },
    stage: {
        type: DataTypes.ENUM('PVC_CUT', 'FOIL_PASTING', 'EMBOSS', 'DOOR_MAKING', 'PACKING', 'DELIVERY', 'OTHER'),
        defaultValue: 'OTHER'
    },
    type: {
        type: DataTypes.ENUM('PRODUCTION_REJECT', 'DELIVERY_RETURN'),
        defaultValue: 'PRODUCTION_REJECT'
    },
    reason: { type: DataTypes.TEXT, allowNull: true },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    reportedBy: { type: DataTypes.STRING, allowNull: true },
    status: {
        type: DataTypes.ENUM('LOGGED', 'REPLACED', 'WRITTEN_OFF'),
        defaultValue: 'LOGGED'
    }
});

module.exports = DamageReport;
