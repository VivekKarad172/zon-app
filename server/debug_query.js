// require('dotenv').config({ path: './server/.env' });
const { sequelize, Order, OrderItem, ProductionUnit, User, Worker } = require('./models');

async function testQuery() {
    try {
        await sequelize.authenticate();
        console.log('DB Connection OK');

        console.log('--- TEST 1: Simple ProductionUnit Fetch ---');
        const units = await ProductionUnit.findAll({ limit: 1 });
        console.log('Units found:', units.length);

        console.log('--- TEST 2: Include OrderItem ---');
        await ProductionUnit.findAll({
            limit: 1,
            include: [{ model: OrderItem }]
        });
        console.log('Include OrderItem OK');

        console.log('--- TEST 3: OrderItem -> Order ---');
        await ProductionUnit.findAll({
            limit: 1,
            include: [{
                model: OrderItem,
                include: [{ model: Order }]
            }]
        });
        console.log('Include Order OK');

        console.log('--- TEST 4: Order -> User (Dealer) ---');
        await ProductionUnit.findAll({
            limit: 1,
            include: [{
                model: OrderItem,
                include: [{
                    model: Order,
                    include: [{ model: User }]
                }]
            }]
        });
        console.log('Include Dealer OK');

        console.log('--- TEST 5: Order -> Distributor (Alias) ---');
        await ProductionUnit.findAll({
            limit: 1,
            include: [{
                model: OrderItem,
                include: [{
                    model: Order,
                    include: [{ model: User, as: 'Distributor' }]
                }]
            }]
        });
        console.log('Include Distributor OK');

    } catch (e) {
        console.error('TEST FAILED:', e.message);
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

testQuery();
