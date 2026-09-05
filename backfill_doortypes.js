const { sequelize, OrderItem, Design } = require('./server/models');

async function backfill() {
    try {
        console.log('Starting Backfill of DoorTypes...');

        // Fetch all items (we can filter for doorTypeId: null closer to DB, but let's fetch all to be safe and robust)
        const items = await OrderItem.findAll({
            include: [Design]
        });

        console.log(`Found ${items.length} items. Checking logic...`);
        let updatedCount = 0;

        for (const item of items) {
            // If item has no doorTypeId but HAS a Design with doorTypeId
            if (!item.doorTypeId && item.Design && item.Design.doorTypeId) {
                item.doorTypeId = item.Design.doorTypeId;
                await item.save(); // This persists the doorTypeId to the OrderItem table
                updatedCount++;
                process.stdout.write('.');
            }
        }

        console.log(`\n\nSuccess! Updated ${updatedCount} items with correct DoorType.`);
    } catch (error) {
        console.error('Backfill Failed:', error);
    } finally {
        process.exit(0);
    }
}

backfill();
