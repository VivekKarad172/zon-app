/**
 * Safe Migration Script for Stock Management
 * Adds currentStock and minStock to SheetMaster
 * Creates StockHistory table
 * 
 * Run this BEFORE starting the server with new code
 */

const { sequelize, SheetMaster, StockHistory } = require('./server/models');

async function migrate() {
    try {
        console.log('🔄 Starting Stock Management Migration...');

        // Step 1: Sync SheetMaster (adds new columns if they don't exist)
        console.log('📊 Updating SheetMaster table...');
        await SheetMaster.sync({ alter: true });
        console.log('✅ SheetMaster updated successfully');

        // Step 2: Create StockHistory table
        console.log('📊 Creating StockHistory table...');
        await StockHistory.sync();
        console.log('✅ StockHistory table created successfully');

        // Step 3: Initialize stock for existing sheets (set to 0)
        const sheets = await SheetMaster.findAll();
        console.log(`📦 Found ${sheets.length} existing sheet sizes`);

        for (const sheet of sheets) {
            if (sheet.currentStock === undefined || sheet.currentStock === null) {
                await sheet.update({ currentStock: 0, minStock: 10 });
            }
        }
        console.log('✅ Initialized stock values for existing sheets');

        console.log('🎉 Migration completed successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Start your server normally');
        console.log('2. Go to Admin Dashboard > Stock tab to add initial inventory');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('');
        console.error('Your database is still safe. The migration did not complete.');
        console.error('Please fix the error and try again.');
        process.exit(1);
    }
}

migrate();
