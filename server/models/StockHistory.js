const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockHistory = sequelize.define('StockHistory', {
    sheetId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'SheetMasters',
            key: 'id'
        }
    },
    change: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Positive for additions, negative for consumption'
    },
    type: {
        type: DataTypes.ENUM('PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'RETURN'),
        allowNull: false,
        defaultValue: 'CONSUMPTION'
    },
    relatedOrderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Order ID if this is consumption from order creation'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

module.exports = StockHistory;
