// require('dotenv').config({ path: './server/.env' }); // Disabled to avoid local env conflicts
const { sequelize, Order, OrderItem, ProductionUnit, Worker } = require('./models');

async function fix() {
    try {
        console.log('Connecting to DB...');
        await sequelize.authenticate();
        console.log('Connected to:', sequelize.getDialect());

        console.log('Syncing Schema (Alter)...');
        await ProductionUnit.sync({ alter: true });
        console.log('Schema Synced.');

        // REPAIR LOGIC
        console.log('Scanning Orders in PRODUCTION...');
        const orders = await sequelize.models.Order.findAll({
            where: { status: 'PRODUCTION' },
            include: [OrderItem]
        });

        let createdCount = 0;
        let migratedCount = 0;

        for (const order of orders) {
            for (const item of order.OrderItems) {
                // Find existing units
                const existingUnits = await ProductionUnit.findAll({ where: { orderItemId: item.id } });

                if (existingUnits.length === 0) {
                    console.log(`Creating ${item.quantity} units for Item ${item.id} (Order ${order.id})`);
                    for (let i = 1; i <= item.quantity; i++) {
                        await ProductionUnit.create({
                            orderItemId: item.id,
                            unitNumber: i,
                            uniqueCode: `OD${order.id}-IT${item.id}-QN${i}`,
                            isPvcDone: false,
                            isFoilDone: false,
                            isEmbossDone: false,
                            isDoorMade: false,
                            isPacked: false
                        });
                        createdCount++;
                    }
                } else {
                    // Migrate
                    for (const unit of existingUnits) {
                        // Logic: If NO flags set, and currentStage exists, migrate.
                        if (!unit.isPvcDone && !unit.isFoilDone && unit.currentStage) {
                            const updates = {};
                            const s = unit.currentStage;
                            if (['FOIL_PASTING', 'EMBOSS', 'DOOR_MAKING', 'PACKING', 'COMPLETED'].includes(s)) updates.isPvcDone = true;
                            if (['EMBOSS', 'DOOR_MAKING', 'PACKING', 'COMPLETED'].includes(s)) updates.isFoilDone = true;
                            if (['DOOR_MAKING', 'PACKING', 'COMPLETED'].includes(s)) updates.isEmbossDone = true;
                            if (['PACKING', 'COMPLETED'].includes(s)) updates.isDoorMade = true;
                            if (['COMPLETED'].includes(s)) updates.isPacked = true; // Wait, COMPLETED might mean "Packed"? User said "Packing Done" -> Packed.

                            if (Object.keys(updates).length > 0) {
                                await unit.update(updates);
                                migratedCount++;
                            }
                        }
                    }
                }
            }
        }

        console.log(`DONE. Created: ${createdCount}, Migrated: ${migratedCount}`);

    } catch (e) {
        console.error('FIX FAILED:', e);
    } finally {
        await sequelize.close();
    }
}

fix();
