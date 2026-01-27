const { sequelize } = require('./server/models');

async function fixSQLite() {
    try {
        console.log('Checking SQLite Schema for ProductionUnits...');

        // 1. Check Table Name
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='ProductionUnits';");
        if (results.length === 0) {
            console.error('Table ProductionUnits not found!');
            // maybe singular?
            const [results2] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='ProductionUnit';");
            if (results2.length > 0) {
                console.log('Found table: ProductionUnit');
            } else {
                console.error('Could not find table ProductionUnits or ProductionUnit');
                process.exit(1);
            }
        } else {
            console.log('Found table: ProductionUnits');
        }

        const TABLE = results.length > 0 ? 'ProductionUnits' : 'ProductionUnit';

        // 2. Check Columns
        const [columns] = await sequelize.query(`PRAGMA table_info(${TABLE});`);
        const colNames = columns.map(c => c.name);
        console.log('Existing columns:', colNames.join(', '));

        const missing = [];
        if (!colNames.includes('isFoilFrontDone')) missing.push('isFoilFrontDone');
        if (!colNames.includes('isFoilBackDone')) missing.push('isFoilBackDone');
        if (!colNames.includes('isFoilSheetPicked')) missing.push('isFoilSheetPicked');

        if (missing.length === 0) {
            console.log('All columns exist. No changes needed.');
        } else {
            console.log('Missing columns:', missing.join(', '));
            for (const col of missing) {
                console.log(`Adding column: ${col}...`);
                // SQLite ADD COLUMN syntax
                // BOOLEAN is stored as INTEGER (0/1) usually, or just numeric. 
                // Sequelize uses TINYINT(1) or BOOLEAN. In SQLite 'BOOLEAN' is fine affinity.
                await sequelize.query(`ALTER TABLE ${TABLE} ADD COLUMN ${col} BOOLEAN DEFAULT 0;`);
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
