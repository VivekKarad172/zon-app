const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
    width: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    height: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // Snapshots for Data Integrity
    designNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: true
    },
    colorNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: true
    },
    designImageSnapshot: {
        type: DataTypes.STRING,
        allowNull: true
    },
    colorImageSnapshot: {
        type: DataTypes.STRING,
        allowNull: true
    },
    remarks: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = OrderItem;
