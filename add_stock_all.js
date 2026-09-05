const { SheetMaster, StockHistory } = require('./server/models');

async function addStockToAll() {
    try {
        const sheets = await SheetMaster.findAll({
            order: [['materialType', 'ASC'], ['width', 'ASC'], ['height', 'ASC']]
        });

        console.log('\n========================================');
        console.log('   ADDING 100 SHEETS TO ALL SIZES');
        console.log('========================================\n');

        let count = 0;
        for (const sheet of sheets) {
            const oldStock = sheet.currentStock;
            const newStock = oldStock + 100;

            await sheet.update({ currentStock: newStock });

            await StockHistory.create({
                sheetId: sheet.id,
                change: 100,
                type: 'PURCHASE',
                description: 'Initial bulk purchase - 100 sheets per size'
            });

            console.log(`✅ ID ${sheet.id}: ${sheet.width} x ${sheet.height} (${sheet.materialType}) → ${oldStock} + 100 = ${newStock}`);
            count++;
        }

        console.log('\n========================================');
        console.log(`✅ SUCCESS! Added 100 sheets to ${count} sizes`);
        console.log(`📦 Total sheets added: ${count * 100}`);
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

addStockToAll();
