const { SheetMaster, Order, OrderItem, Design } = require('./server/models');
const { Op } = require('sequelize');
const { getOptimalBlankSize, getDesignType } = require('./server/utils/designLogic');

async function testAPI() {
    try {
        console.log('Testing /api/sheets endpoint logic...\n');

        const sheets = await SheetMaster.findAll({
            where: { isEnabled: true },
            order: [['materialType', 'ASC'], ['width', 'ASC'], ['height', 'ASC']],
            limit: 3
        });

        console.log(`Found ${sheets.length} sheets`);

        // Get all pending/processing orders
        const activeOrders = await Order.findAll({
            where: {
                status: {
                    [Op.in]: ['PENDING', 'PROCESSING', 'IN_PRODUCTION']
                }
            },
            include: [{
                model: OrderItem,
                include: [{ model: Design }]
            }]
        });

        console.log(`Found ${activeOrders.length} active orders\n`);

        // Process first sheet
        const sheet = sheets[0];
        console.log(`Processing sheet: ${sheet.width}x${sheet.height} (${sheet.materialType})`);
        console.log(`  currentStock: ${sheet.currentStock}`);
        console.log(`  minStock: ${sheet.minStock}`);

        const result = {
            ...sheet.toJSON(),
            stockStatus: sheet.currentStock <= sheet.minStock ? 'LOW' : 'GOOD',
            isLow: sheet.currentStock <= sheet.minStock,
            ordersReceived: 0,
            blockedSheets: 0
        };

        console.log('\nResult object:');
        console.log(JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testAPI();
