const { Order, OrderItem, SheetMaster, StockHistory, Design } = require('./server/models');
const { getOptimalBlankSize, getDesignType } = require('./server/utils/designLogic');

async function backfillStockForExistingOrders() {
    try {
        console.log('\n========================================');
        console.log('  BACKFILL STOCK FOR EXISTING ORDERS');
        console.log('========================================\n');

        // Get all existing orders
        const orders = await Order.findAll({
            include: [{
                model: OrderItem,
                include: [{ model: Design }]
            }],
            order: [['id', 'ASC']]
        });

        console.log(`Found ${orders.length} existing orders to process...\n`);

        let totalOrdersProcessed = 0;
        let totalSheetsDeducted = 0;
        let errors = [];

        for (const order of orders) {
            if (!order.OrderItems || order.OrderItems.length === 0) continue;

            let orderSheetsDeducted = 0;

            for (const item of order.OrderItems) {
                try {
                    // Get design info
                    const designRef = item.Design?.designNumber || item.designNameSnapshot || 'Unknown';
                    const designType = item.Design?.category || getDesignType(designRef);
                    const materialType = String(designRef).toUpperCase().startsWith('WPC') ? 'WPC' : 'PVC';

                    // Get available sheets
                    const availableSheets = await SheetMaster.findAll({
                        where: {
                            isEnabled: true,
                            materialType: materialType
                        }
                    });

                    // Calculate blank size
                    const blankSize = getOptimalBlankSize(item.width, item.height, designType, availableSheets);

                    if (blankSize && blankSize !== 'No match' && blankSize !== 'Missing Dimensions') {
                        // Find sheet
                        const [width, , height] = blankSize.split(' ');
                        const sheet = await SheetMaster.findOne({
                            where: {
                                width: parseFloat(width),
                                height: parseFloat(height),
                                materialType: materialType,
                                isEnabled: true
                            }
                        });

                        if (sheet) {
                            // Calculate sheets needed (2 per door)
                            const sheetsNeeded = item.quantity * 2;

                            // Deduct stock
                            const newStock = sheet.currentStock - sheetsNeeded;

                            if (newStock < 0) {
                                console.log(`⚠️  Order #${order.id}: Would make stock negative for ${blankSize} (need ${sheetsNeeded}, have ${sheet.currentStock})`);
                                errors.push({
                                    orderId: order.id,
                                    size: blankSize,
                                    needed: sheetsNeeded,
                                    available: sheet.currentStock
                                });
                            } else {
                                await sheet.update({ currentStock: newStock });

                                // Create history
                                await StockHistory.create({
                                    sheetId: sheet.id,
                                    change: -sheetsNeeded,
                                    type: 'CONSUMPTION',
                                    relatedOrderId: order.id,
                                    description: `BACKFILL: Order #${order.id} - ${item.quantity} doors (${blankSize})`
                                });

                                orderSheetsDeducted += sheetsNeeded;
                                totalSheetsDeducted += sheetsNeeded;
                            }
                        }
                    }
                } catch (itemErr) {
                    console.error(`Error processing item in Order #${order.id}:`, itemErr.message);
                }
            }

            if (orderSheetsDeducted > 0) {
                console.log(`✅ Order #${order.id}: Deducted ${orderSheetsDeducted} sheets`);
                totalOrdersProcessed++;
            }
        }

        console.log('\n========================================');
        console.log('           BACKFILL COMPLETE');
        console.log('========================================');
        console.log(`✅ Orders processed: ${totalOrdersProcessed}`);
        console.log(`📦 Total sheets deducted: ${totalSheetsDeducted}`);

        if (errors.length > 0) {
            console.log(`\n⚠️  ${errors.length} orders would cause negative stock:`);
            errors.slice(0, 5).forEach(e => {
                console.log(`   Order #${e.orderId}: ${e.size} (need ${e.needed}, have ${e.available})`);
            });
            if (errors.length > 5) {
                console.log(`   ... and ${errors.length - 5} more`);
            }
        }

        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

backfillStockForExistingOrders();
