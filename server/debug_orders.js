const { Order } = require('./models');

async function debug() {
    const orders = await Order.findAll({ attributes: ['id', 'status', 'createdAt'] });
    console.log('ALL ORDERS:');
    orders.forEach(o => console.log(`#${o.id} - ${o.status}`));
}
debug();
