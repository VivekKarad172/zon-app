/**
 * REPAIR SCRIPT: Create missing ProductionUnits for PRODUCTION orders
 * This script finds all orders in PRODUCTION status that are missing ProductionUnits
 * and creates them.
 */

const { ProductionUnit, OrderItem, Order } = require('./models');

async function repairProductionUnits() {
    try {
        console.log('\n🔧 STARTING PRODUCTION UNIT REPAIR...\n');

        // Find all orders in PRODUCTION status
        const productionOrders = await Order.findAll({
            where: { status: 'PRODUCTION' },
            include: [{ model: OrderItem }]
        });

        console.log(`Found ${productionOrders.length} orders in PRODUCTION status`);

        let ordersProcessed = 0;
        let unitsCreated = 0;
        let ordersSkipped = 0;

        for (const order of productionOrders) {
            if (!order.OrderItems || order.OrderItems.length === 0) {
                console.log(`⚠️  Order ${order.id} has no items, skipping...`);
                ordersSkipped++;
                continue;
            }

            let orderNeedsUnits = false;

            for (const item of order.OrderItems) {
                // Check if ProductionUnits already exist
                const existingUnits = await ProductionUnit.count({
                    where: { orderItemId: item.id }
                });

                if (existingUnits === 0) {
                    orderNeedsUnits = true;
                    // Create units for this item
                    for (let i = 1; i <= item.quantity; i++) {
                        await ProductionUnit.create({
                            orderItemId: item.id,
                            unitNumber: i,
                            uniqueCode: `OD${order.id}-IT${item.id}-QN${i}`,
                            currentStage: 'PVC_CUT',
                            isPvcDone: false,
                            isFoilDone: false,
                            isEmbossDone: false,
                            isDoorMade: false,
                            isPacked: false
                        });
                        unitsCreated++;
                    }
                    console.log(`✅ Created ${item.quantity} units for Order ${order.id}, Item ${item.id}`);
                } else if (existingUnits < item.quantity) {
                    console.log(`⚠️  Order ${order.id}, Item ${item.id} has ${existingUnits}/${item.quantity} units - creating missing ones...`);
                    orderNeedsUnits = true;
                    // Create missing units
                    for (let i = existingUnits + 1; i <= item.quantity; i++) {
                        await ProductionUnit.create({
                            orderItemId: item.id,
                            unitNumber: i,
                            uniqueCode: `OD${order.id}-IT${item.id}-QN${i}`,
                            currentStage: 'PVC_CUT'
                        });
                        unitsCreated++;
                    }
                }
            }

            if (orderNeedsUnits) {
                ordersProcessed++;
            } else {
                ordersSkipped++;
            }
        }

        console.log('\n=== REPAIR SUMMARY ===');
        console.log(`✅ Orders processed: ${ordersProcessed}`);
        console.log(`📦 Production units created: ${unitsCreated}`);
        console.log(`⏭️  Orders skipped (already had units): ${ordersSkipped}`);
        console.log('\n✨ Repair complete! Workers should now see all orders.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ REPAIR ERROR:', error);
        process.exit(1);
    }
}

repairProductionUnits();
