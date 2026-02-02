const { ProductionUnit, OrderItem, Order, Design, Color, User } = require('./models');

async function checkProductionUnits() {
    try {
        console.log('\n=== CHECKING PRODUCTION UNITS ===\n');

        // Count all ProductionUnits
        const totalUnits = await ProductionUnit.count();
        console.log(`Total ProductionUnits in database: ${totalUnits}`);

        // Count unpacked units
        const unpackedUnits = await ProductionUnit.count({ where: { isPacked: false } });
        console.log(`Unpacked ProductionUnits: ${unpackedUnits}`);

        // Check orders in PRODUCTION status
        const productionOrders = await Order.findAll({
            where: { status: 'PRODUCTION' },
            include: [{ model: OrderItem }]
        });
        console.log(`\nOrders with status='PRODUCTION': ${productionOrders.length}`);

        if (productionOrders.length > 0) {
            console.log('\nSample PRODUCTION order:');
            const sample = productionOrders[0];
            console.log(`  Order ID: ${sample.id}`);
            console.log(`  Status: ${sample.status}`);
            console.log(`  OrderItems: ${sample.OrderItems?.length || 0}`);

            if (sample.OrderItems && sample.OrderItems.length > 0) {
                const item = sample.OrderItems[0];
                const units = await ProductionUnit.findAll({
                    where: { orderItemId: item.id }
                });
                console.log(`  ProductionUnits for first item: ${units.length}`);
            }
        }

        // Get a sample ProductionUnit with all relations
        const sampleUnit = await ProductionUnit.findOne({
            where: { isPacked: false },
            include: [{
                model: OrderItem,
                include: [
                    { model: Design },
                    { model: Color },
                    { model: Order }
                ]
            }]
        });

        if (sampleUnit) {
            console.log('\n=== SAMPLE UNPACKED UNIT ===');
            console.log('ID:', sampleUnit.id);
            console.log('UniqueCode:', sampleUnit.uniqueCode);
            console.log('Has OrderItem:', !!sampleUnit.OrderItem);
            console.log('Has Design:', !!sampleUnit.OrderItem?.Design);
            console.log('Has Color:', !!sampleUnit.OrderItem?.Color);
            console.log('Has Order:', !!sampleUnit.OrderItem?.Order);
            console.log('Order Status:', sampleUnit.OrderItem?.Order?.status);
            console.log('Order ID:', sampleUnit.OrderItem?.Order?.id);
        } else {
            console.log('\n❌ NO UNPACKED PRODUCTION UNITS FOUND!');
        }

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

checkProductionUnits();
