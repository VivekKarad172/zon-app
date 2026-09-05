/**
 * Migration: add Order.siteName (dealer's site/party reference per order).
 * Run once: node server/migrate_sitename.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { sequelize } = require('./models');
const { DataTypes } = require('sequelize');

async function run() {
    const qi = sequelize.getQueryInterface();
    try {
        const cols = await qi.describeTable('Orders');
        if (cols.siteName) console.log('✅ Orders.siteName already exists');
        else { await qi.addColumn('Orders', 'siteName', { type: DataTypes.STRING, allowNull: true }); console.log('✅ Added Orders.siteName'); }
        console.log('🎉 Done.');
    } catch (e) { console.error('❌ Failed:', e.message); }
    finally { await sequelize.close(); }
}
run();
