const { Sequelize } = require('./server/node_modules/sequelize');
const path = require('path');
const fs = require('fs');

async function fixDatabase(dbPath, dbName) {
    if (!fs.existsSync(dbPath)) {
        console.log(`Skipping ${dbName} (File not found)`);
        return;
    }

    console.log(`\n--- Fixing ${dbName} ---`);
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: false
    });

    try {
        // 1. Check Table Name
        const [results] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name='ProductionUnits';");
        const TABLE = results.length > 0 ? 'ProductionUnits' : 'ProductionUnit';

        // Check if table exists at all
        const [checkTable] = await sequelize.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${TABLE}';`);
        if (checkTable.length === 0) {
            console.error(`Table ${TABLE} not found in ${dbName}`);
            return;
        }

        // 2. Check Columns
        const [columns] = await sequelize.query(`PRAGMA table_info(${TABLE});`);
        const colNames = columns.map(c => c.name);
        console.log(`Existing columns in ${dbName}:`, colNames.join(', '));

        const missing = [];
        if (!colNames.includes('isFoilFrontDone')) missing.push('isFoilFrontDone');
        if (!colNames.includes('isFoilBackDone')) missing.push('isFoilBackDone');
        if (!colNames.includes('isFoilSheetPicked')) missing.push('isFoilSheetPicked');

        if (missing.length === 0) {
            console.log(`All columns exist in ${dbName}.`);
        } else {
            for (const col of missing) {
                console.log(`Adding ${col} to ${dbName}...`);
                await sequelize.query(`ALTER TABLE ${TABLE} ADD COLUMN ${col} BOOLEAN DEFAULT 0;`);
            }
            console.log(`Fixed ${dbName}.`);
        }

    } catch (error) {
        console.error(`Error fixing ${dbName}:`, error.message);
    }
}

async function run() {
    // Fix default one
    await fixDatabase(path.join(__dirname, 'server', 'database.sqlite'), 'database.sqlite');

    // Fix dev.db (from .env)
    await fixDatabase(path.join(__dirname, 'server', 'dev.db'), 'dev.db');
}

run();
