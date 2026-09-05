const { SheetMaster, StockHistory } = require('./server/models');

async function initializeStock() {
    try {
        const sheets = await SheetMaster.findAll();
        console.log(`📦 Updating ${sheets.length} sheet sizes...`);

        let updatedCount = 0;
        let totalAdded = 0;

        for (const sheet of sheets) {
            // 1. Update minStock
            const newMinStock = sheet.materialType === 'WPC' ? 10 : 50;

            // 2. Add 100 stock if currently 0
            let newCurrentStock = sheet.currentStock;
            if (sheet.currentStock === 0) {
                newCurrentStock = 100;

                // Create history record
                await StockHistory.create({
                    sheetId: sheet.id,
                    change: 100,
                    type: 'PURCHASE',
                    description: 'INITIAL STOCK: Recovery Migration'
                });
                totalAdded += 100;
            }

            await sheet.update({
                minStock: newMinStock,
                currentStock: newCurrentStock
            });
            updatedCount++;
        }

        console.log(`✅ SUCCESS! Updated ${updatedCount} sizes.`);
        console.log(`📦 Total sheets added: ${totalAdded}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

initializeStock();
