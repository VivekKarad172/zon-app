/**
 * Migration: add dispatch/challan columns to Orders.
 * Run once: node server/migrate_dispatch_fields.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { sequelize } = require('./models');
const { DataTypes } = require('sequelize');

async function run() {
    const qi = sequelize.getQueryInterface();
    try {
        const cols = await qi.describeTable('Orders');
        const add = async (name, type) => {
            if (cols[name]) { console.log(`✅ Orders.${name} exists`); }
            else { await qi.addColumn('Orders', name, { type, allowNull: true }); console.log(`✅ Added Orders.${name}`); }
        };
        await add('vehicleNo', DataTypes.STRING);
        await add('transportName', DataTypes.STRING);
        await add('lrNumber', DataTypes.STRING);
        await add('dispatchedAt', DataTypes.DATE);
        console.log('\n🎉 Dispatch fields migration complete.');
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
    } finally {
        await sequelize.close();
    }
}
run();
