const { sequelize, ProductionUnit, Order } = require('./models');

async function check() {
    try {
        const count = await ProductionUnit.count();
        console.log(`Total Production Units: ${count}`);

        if (count > 0) {
            const stages = await ProductionUnit.findAll({
                attributes: ['currentStage', [sequelize.fn('COUNT', 'id'), 'cnt']],
                group: ['currentStage']
            });
            console.log('Distribution:', stages.map(s => `${s.currentStage}: ${s.get('cnt')}`));
        } else {
            console.log('No units found. Checking Orders in PRODUCTION...');
            const prodOrders = await Order.count({ where: { status: 'PRODUCTION' } });
            console.log(`Orders in PRODUCTION status: ${prodOrders}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        // Close connection immediately to let script exit (or rely on tool timeout)
        // actually sequelize.close() is better
        // await sequelize.close(); 
    }
}

check();
