const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Design = sequelize.define('Design', {
    designNumber: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isTrending: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = Design;
