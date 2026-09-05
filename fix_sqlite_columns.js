const { sequelize } = require('./server/models');

async function fixSQLite() {
    try {
        console.log('Checking SQLite Schema for ProductionUnits...');

        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='OrderItems';");
        const TABLE = 'OrderItems';

        if (results.length === 0) {
            console.log('OrderItems table not found?');
        } else {
            console.log('Found table: OrderItems');
        }

        // 2. Check Columns
        const [columns] = await sequelize.query(`PRAGMA table_info(${TABLE});`);
        const colNames = columns.map(c => c.name);
        console.log('Existing columns:', colNames.join(', '));

        const missing = [];
        if (!colNames.includes('doorTypeId')) missing.push('doorTypeId');

        if (missing.length === 0) {
            console.log('All columns exist. No changes needed.');
        } else {
            console.log('Missing columns:', missing.join(', '));
            for (const col of missing) {
                console.log(`Adding column: ${col}...`);
                await sequelize.query(`ALTER TABLE ${TABLE} ADD COLUMN ${col} INTEGER DEFAULT NULL;`);
                console.log(`Added ${col}.`);
            }
            console.log('Schema Repair Complete.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Force sync just in case to update internal dicts if possible, though not needed for restart
        process.exit(0);
    }
}

fixSQLite();
