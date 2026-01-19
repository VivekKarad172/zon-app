// Direct Database Test - Bypasses ALL API logic
// Run this with: node test_create_distributor.js

const bcrypt = require('bcryptjs');

async function test() {
    console.log('=== DIRECT DATABASE TEST ===\n');

    try {
        // 1. Connect to database
        console.log('1. Loading database connection...');
        const sequelize = require('./config/database');

        console.log('2. Testing connection...');
        await sequelize.authenticate();
        console.log('   ✓ Database connected!\n');

        // 2. Load User model
        console.log('3. Loading User model...');
        const User = require('./models/User');
        console.log('   ✓ Model loaded!\n');

        // 3. Sync model (this will create table if not exists)
        console.log('4. Syncing model to database...');
        await User.sync();
        console.log('   ✓ Model synced!\n');

        // 4. Check if 'shubham' already exists
        console.log('5. Checking if shubham already exists...');
        const existing = await User.findOne({ where: { username: 'shubham' } });
        if (existing) {
            console.log('   ⚠ User "shubham" already exists! Deleting first...');
            await existing.destroy();
            console.log('   ✓ Deleted!\n');
        } else {
            console.log('   ✓ Username available!\n');
        }

        // 5. Create the distributor DIRECTLY
        console.log('6. Creating distributor directly in database...');
        const hashedPassword = await bcrypt.hash('shubham123', 10);

        const newUser = await User.create({
            name: 'Shubham Enterprise',
            username: 'shubham',
            password: hashedPassword,
            role: 'DISTRIBUTOR',
            city: 'Surat',
            isEnabled: true,
            // Explicitly set nullable fields to null
            email: null,
            distributorId: null,
            shopName: null
        });

        console.log('   ✓ SUCCESS! User created with ID:', newUser.id);
        console.log('\n=== CREATED USER DETAILS ===');
        console.log({
            id: newUser.id,
            name: newUser.name,
            username: newUser.username,
            role: newUser.role,
            city: newUser.city,
            isEnabled: newUser.isEnabled
        });

        console.log('\n✓✓✓ DATABASE WORKS! The problem is in the API layer.\n');

    } catch (error) {
        console.log('\n❌ ERROR OCCURRED:');
        console.log('Error Name:', error.name);
        console.log('Error Message:', error.message);
        console.log('\nFull Error:');
        console.log(error);

        if (error.name === 'SequelizeDatabaseError') {
            console.log('\n>>> This is a DATABASE SCHEMA issue!');
            console.log('>>> Try running: node server/seed.js');
        }
    }

    process.exit(0);
}

test();
