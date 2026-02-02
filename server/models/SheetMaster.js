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
    isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['width', 'height']
        }
    ]
});

module.exports = SheetMaster;
