const { sequelize } = require('./server/models');
const { ProductionUnit } = require('./server/models');

async function syncSchema() {
    try {
        console.log('Force syncing ProductionUnit schema...');
        await ProductionUnit.sync({ alter: true });
        console.log('Schema Sync Successful.');
        process.exit(0);
    } catch (error) {
        console.error('Schema Sync Failed:', error);
        process.exit(1);
    }
}

syncSchema();
