const { Sequelize } = require('./server/node_modules/sequelize');
const path = require('path');

async function migrate() {
    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, 'server', 'database.sqlite'),
        logging: console.log
    });

    try {
        console.log('==============================================');
        console.log('  MIGRATING: Separate Front/Back Pick Columns');
        console.log('==============================================\n');

        const TABLE = 'ProductionUnits';

        // 1. Check existing columns
        const [columns] = await sequelize.query(`PRAGMA table_info(${TABLE});`);
        const colNames = columns.map(c => c.name);
        console.log('Current columns:', colNames.join(', '));

        // 2. Add new columns if missing
        if (!colNames.includes('isFoilFrontSheetPicked')) {
            console.log('Adding isFoilFrontSheetPicked...');
            await sequelize.query(`ALTER TABLE ${TABLE} ADD COLUMN isFoilFrontSheetPicked BOOLEAN DEFAULT 0;`);
        }

        if (!colNames.includes('isFoilBackSheetPicked')) {
            console.log('Adding isFoilBackSheetPicked...');
            await sequelize.query(`ALTER TABLE ${TABLE} ADD COLUMN isFoilBackSheetPicked BOOLEAN DEFAULT 0;`);
        }

        // 3. Migration: Copy old isFoilSheetPicked to BOTH Front and Back if it was checked
        if (colNames.includes('isFoilSheetPicked')) {
            console.log('\nMigrating old "Pick" data to Front and Back...');
            await sequelize.query(`
                UPDATE ${TABLE} 
                SET isFoilFrontSheetPicked = isFoilSheetPicked,
                    isFoilBackSheetPicked = isFoilSheetPicked
                WHERE isFoilSheetPicked = 1;
            `);
            console.log('Data migrated.');

            // Note: SQLite doesn't support DROP COLUMN easily, so we'll leave it
            console.log('\nNote: Old "isFoilSheetPicked" column is kept for backward compatibility.');
            console.log('It will be ignored by the application.');
        }

        console.log('\n==============================================');
        console.log('  Migration Successful!');
        console.log('==============================================');

    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

migrate();
