const { User } = require('./models');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createManager = async () => {
    try {
        const hashedPassword = await bcrypt.hash('manager123', 10);

        const [user, created] = await User.findOrCreate({
            where: { username: 'manager' },
            defaults: {
                username: 'manager',
                password: hashedPassword,
                role: 'MANAGER',
                name: 'Factory Manager',
                isEnabled: true
            }
        });

        if (created) {
            console.log('✅ Manager user created successfully!');
            console.log('Username: manager');
            console.log('Password: manager123');
        } else {
            console.log('ℹ️ Manager user already exists.');
            // Update role to ensure it is MANAGER (in case it was something else)
            if (user.role !== 'MANAGER') {
                user.role = 'MANAGER';
                await user.save();
                console.log('✅ Updated existing user role to MANAGER.');
            }
        }

    } catch (error) {
        console.error('Error creating manager:', error);
    }
};

createManager();
