// Quick script to add default users if they don't exist
// Run with: node server/fix_users.js

const bcrypt = require('bcryptjs');
const { sequelize, User } = require('./models');

async function fixUsers() {
    try {
        await sequelize.sync({ alter: true }); // Update schema without destroying data

        console.log('Checking/Creating default users...');

        // 1. Manufacturer Admin
        let admin = await User.findOne({ where: { username: 'admin' } });
        if (!admin) {
            const password = await bcrypt.hash('admin123', 10);
            admin = await User.create({
                username: 'admin',
                password,
                role: 'MANUFACTURER',
                name: 'Z-on Door Admin',
                isEnabled: true
            });
            console.log('✅ Created admin user (username: admin, password: admin123)');
        } else {
            console.log('✓ Admin user exists');
        }

        // 2. Sample Distributor
        let dist1 = await User.findOne({ where: { username: 'dist1' } });
        if (!dist1) {
            dist1 = await User.create({
                username: 'dist1',
                password: await bcrypt.hash('dist123', 10),
                role: 'DISTRIBUTOR',
                name: 'North Distributor',
                isEnabled: true
            });
            console.log('✅ Created distributor (username: dist1, password: dist123)');
        } else {
            console.log('✓ Distributor dist1 exists');
        }

        // 3. Sample Dealer
        let deal1 = await User.findOne({ where: { email: 'dealer@test.com' } });
        if (!deal1) {
            deal1 = await User.create({
                email: 'dealer@test.com',
                role: 'DEALER',
                name: 'Test Dealer',
                distributorId: dist1.id,
                isEnabled: true
            });
            console.log('✅ Created dealer (email: dealer@test.com)');
        } else {
            console.log('✓ Dealer dealer@test.com exists');
        }

        console.log('\n=== LOGIN CREDENTIALS ===');
        console.log('Manufacturer: username=admin, password=admin123');
        console.log('Distributor: username=dist1, password=dist123');
        console.log('Dealer: email=dealer@test.com (use Dealer Login tab)');

        console.log('\nDone!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixUsers();
