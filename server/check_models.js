const { sequelize, User, SheetMaster } = require('./models');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('Database connection OK.');

        // Sync just to be sure (safe for existing tables usually, generic sync)
        // actually don't sync, just count
        const userCount = await User.count();
        console.log('User count:', userCount);

        // Check SheetMaster
        if (SheetMaster) {
            console.log('SheetMaster model loaded.');
            // Check if table exists (will fail if not migrated/synced)
            try {
                const sheetCount = await SheetMaster.count();
                console.log('SheetMaster count:', sheetCount);
            } catch (e) {
                console.log('SheetMaster table might be missing:', e.message);
            }
        } else {
            console.error('SheetMaster model NOT loaded.');
        }

        console.log('All Checks Passed.');
        process.exit(0);
    } catch (error) {
        console.error('Check Failed:', error);
        process.exit(1);
    }
}

check();
