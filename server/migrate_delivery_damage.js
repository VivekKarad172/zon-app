/**
 * Migration: add Order.expectedDate column + create DamageReports table.
 * Run once: node server/migrate_delivery_damage.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { sequelize, DamageReport } = require('./models');
const { DataTypes } = require('sequelize');

async function run() {
    const qi = sequelize.getQueryInterface();
    try {
        // 1. Order.expectedDate
        const orderCols = await qi.describeTable('Orders');
        if (orderCols.expectedDate) {
            console.log('✅ Orders.expectedDate already exists');
        } else {
            await qi.addColumn('Orders', 'expectedDate', { type: DataTypes.DATE, allowNull: true });
            console.log('✅ Added Orders.expectedDate');
        }

        // 2. DamageReports table (create if missing)
        await DamageReport.sync();
        console.log('✅ DamageReports table ready');

        console.log('\n🎉 Migration complete.');
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
    } finally {
        await sequelize.close();
    }
}
run();
