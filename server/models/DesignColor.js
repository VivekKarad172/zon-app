const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DesignColor = sequelize.define('DesignColor', {
    // Junction table, typically just FKs, but we can add meta if needed later
});

module.exports = DesignColor;
