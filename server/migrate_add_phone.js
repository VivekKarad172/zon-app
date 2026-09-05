/**
 * One-time migration: add `phone` column to Users table
 * Run once: node server/migrate_add_phone.js
 */
require('dotenv').config();
const sequelize = require('./config/database');

async function run() {
    const qi = sequelize.getQueryInterface();
    const { DataTypes } = require('sequelize');

    try {
        // Check if column already exists
        const desc = await qi.describeTable('Users');
        if (desc.phone) {
            console.log('✅ phone column already exists — nothing to do.');
        } else {
            await qi.addColumn('Users', 'phone', {
                type: DataTypes.STRING,
                allowNull: true
            });
            console.log('✅ phone column added to Users table.');
        }
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
    } finally {
        await sequelize.close();
    }
}

run();
