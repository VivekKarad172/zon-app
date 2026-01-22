require('dotenv').config({ path: './server/.env' });
const { sequelize, Order, OrderItem, ProductionUnit, Worker, ProcessRecord } = require('./models');

async function fix() {
    console.log('DB URL Env Var:', process.env.DATABASE_URL ? 'PRESENT' : 'MISSING');
    console.log('Sequelize Dialect:', sequelize.getDialect());

    try {
        await sequelize.authenticate();
        console.log('DB Connection OK');
    } catch (e) {
        console.error('DB Connection Failed:', e.message);
        return;
    }

    console.log('Syncing Factory Tables...');
    await Worker.sync();
    await ProductionUnit.sync();
    await ProcessRecord.sync();
    console.log('Factory Tables Synced.');

    console.log('Checking for missing Production Units...');

    // Find all orders in PRODUCTION status
    const orders = await Order.findAll({
        where: { status: 'PRODUCTION' },
        include: [OrderItem]
    });

    console.log(`Found ${orders.length} orders in PRODUCTION status.`);

    let createdCount = 0;

    for (const order of orders) {
        console.log(`Processing Order #${order.id}...`);

        for (const item of order.OrderItems) {
            // Check if units exist
            const existing = await ProductionUnit.count({ where: { orderItemId: item.id } });
            if (existing > 0) {
                // console.log(`  Item ${item.id} already has units.`);
                continue;
            }

            console.log(`  Creating ${item.quantity} units for Item ${item.id}...`);

            // Create Units
            for (let i = 1; i <= item.quantity; i++) {
                await ProductionUnit.create({
                    orderItemId: item.id,
                    unitNumber: i,
                    uniqueCode: `OD${order.id}-IT${item.id}-QN${i}`,
                    currentStage: 'PVC_CUT'
                });
                createdCount++;
            }
        }
    }

    console.log(`DONE. Created ${createdCount} new Production Units.`);
}

fix();
