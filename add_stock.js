const { SheetMaster, StockHistory } = require('./server/models');

// Get command line arguments
const sheetId = process.argv[2];
const quantity = parseInt(process.argv[3]);
const description = process.argv[4] || 'Stock purchase';

if (!sheetId || !quantity) {
    console.log('\n❌ Usage: node add_stock.js <sheetId> <quantity> [description]');
    console.log('\nExample: node add_stock.js 1 100 "Purchase from supplier"');
    console.log('\nRun "node view_stock.js" to see available sheet IDs\n');
    process.exit(1);
}

async function addStock() {
    try {
        const sheet = await SheetMaster.findByPk(sheetId);

        if (!sheet) {
            console.log(`\n❌ Sheet ID ${sheetId} not found!`);
            console.log('Run "node view_stock.js" to see available sheets\n');
            process.exit(1);
        }

        const oldStock = sheet.currentStock;
        const newStock = oldStock + quantity;

        // Update stock
        await sheet.update({ currentStock: newStock });

        // Create history record
        await StockHistory.create({
            sheetId: sheet.id,
            change: quantity,
            type: 'PURCHASE',
            description: description
        });

        console.log('\n✅ Stock Added Successfully!');
        console.log('========================================');
        console.log(`Sheet Size: ${sheet.width} x ${sheet.height} (${sheet.materialType})`);
        console.log(`Previous Stock: ${oldStock}`);
        console.log(`Added: +${quantity}`);
        console.log(`New Stock: ${newStock}`);
        console.log(`Description: ${description}`);
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

addStock();
