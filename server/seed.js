const { sequelize, User, DoorType, Design, Color, DesignColor, Order, OrderItem } = require('./models');
const bcrypt = require('bcryptjs');

async function seed() {
    await sequelize.sync({ force: true }); // !! DESTRUCTIVE: Resets DB

    // 1. Create Users
    const password = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
        username: 'admin',
        password,
        role: 'MANUFACTURER', // Enum value
        name: 'Z-on Door Admin'
    });

    const dist1 = await User.create({
        username: 'dist1',
        password: await bcrypt.hash('dist123', 10),
        role: 'DISTRIBUTOR',
        name: 'North Distributor'
    });

    const deal1 = await User.create({
        username: 'deal1',
        email: 'dealer@test.com', // Added email for Dealer Login
        password: await bcrypt.hash('deal123', 10),
        role: 'DEALER',
        name: 'City Shop 1',
        distributorId: dist1.id
    });

    console.log('Users created');

    // 2. Door Types
    const pvc = await DoorType.create({ name: 'PVC', thickness: '30mm', isEnabled: true });
    const wpc = await DoorType.create({ name: 'WPC', thickness: '28mm', isEnabled: true });

    console.log('Door Types created');

    // 3. Global Colors
    const colors = await Color.bulkCreate([
        { name: 'Teak Wood', hexCode: '#8B4513', isEnabled: true },
        { name: 'Matt White', hexCode: '#FFFFFF', isEnabled: true },
        { name: 'Charcoal Grey', hexCode: '#36454F', isEnabled: true },
        { name: 'Royal Blue', hexCode: '#4169E1', isEnabled: true }
    ]);

    console.log('Global Colors created');

    // 4. Designs
    const d1 = await Design.create({
        designNumber: 'D-001',
        category: 'Modern',
        doorTypeId: pvc.id,
        isTrending: true,
        isEnabled: true
    });

    const d2 = await Design.create({
        designNumber: 'D-002',
        category: 'Floral',
        doorTypeId: pvc.id,
        isTrending: false,
        isEnabled: true
    });

    // 5. Link Designs to Colors (Many-to-Many)
    // D-001 available in Teak and White
    await d1.addColors([colors[0], colors[1]]);
    // D-002 available in all
    await d2.addColors(colors);

    console.log('Designs and Links created');

    // 6. Sample Order
    const order = await Order.create({
        userId: deal1.id,
        distributorId: dist1.id,
        status: 'RECEIVED'
    });

    await OrderItem.create({
        orderId: order.id,
        designId: d1.id,
        colorId: colors[0].id,
        width: 30,
        height: 80,
        quantity: 5,
        // Snapshots
        designNameSnapshot: d1.designNumber,
        colorNameSnapshot: colors[0].name,
        designImageSnapshot: d1.imageUrl,
        colorImageSnapshot: colors[0].imageUrl,
        remarks: 'Urgent delivery'
    });

    console.log('Seed Data Created Successfully!');
}

if (require.main === module) {
    seed().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = seed;
