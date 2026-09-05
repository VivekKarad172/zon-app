const { sequelize, SheetMaster, StockHistory } = require('./server/models');

async function migrate() {
    try {
        console.log('🔄 Starting Stock Management Migration V2...');

        // Step 1: Create StockHistory table if it doesn't exist
        console.log('📊 Creating StockHistory table...');
        await StockHistory.sync();
        console.log('✅ StockHistory table created successfully');

        // Step 2: Update minStock and add initial stock
        const sheets = await SheetMaster.findAll();
        console.log(`📦 Initializing ${sheets.length} sheet sizes...`);

        let updatedCount = 0;
        let totalAdded = 0;

        for (const sheet of sheets) {
            // 1. Update minStock (PVC=50, WPC=10)
            const newMinStock = sheet.materialType === 'WPC' ? 10 : 50;

            // 2. Add 100 stock if currently 0
            if (sheet.currentStock === 0) {
                await sheet.update({
                    currentStock: 100,
                    minStock: newMinStock
                });

                // Create history record
                await StockHistory.create({
                    sheetId: sheet.id,
                    change: 100,
                    type: 'PURCHASE',
                    description: 'INITIAL STOCK: Recovery Baseline'
                });
                totalAdded += 100;
            } else {
                await sheet.update({
                    minStock: newMinStock
                });
            }
            updatedCount++;
        }

        console.log(`✅ SUCCESS! Updated ${updatedCount} sizes.`);
        console.log(`📦 Total sheets added: ${totalAdded}`);

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
