const { Sequelize } = require('sequelize');
const path = require('path');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: console.log
});

async function run() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        // Add Columns
        const queries = [
            `ALTER TABLE OrderItems ADD COLUMN hasLock BOOLEAN DEFAULT 0`,
            `ALTER TABLE OrderItems ADD COLUMN hasVent BOOLEAN DEFAULT 0`
        ];

        for (const q of queries) {
            try {
                await sequelize.query(q);
                console.log(`Success: ${q}`);
            } catch (e) {
                if (e.message.includes('duplicate column')) {
                    console.log(`Column already exists: ${q}`);
                } else {
                    console.error(`Error: ${q}`, e.message);
                }
            }
        }

    } catch (err) {
        console.error('Fatal:', err);
    }
}

run();
