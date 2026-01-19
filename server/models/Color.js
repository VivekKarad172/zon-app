const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Color = sequelize.define('Color', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    hexCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true // Optional image for texture/color
    },
    isEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
});

module.exports = Color;
