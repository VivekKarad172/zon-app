const { sequelize, User } = require('./models');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        await sequelize.sync();
        const hashedPassword = await bcrypt.hash('admin123', 10);

        const [user, created] = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                role: 'MANUFACTURER',
                name: 'Admin User',
                password: hashedPassword, // Will be ignored if finding
                isEnabled: true
            }
        });

        // Force update password
        user.password = hashedPassword;
        user.isEnabled = true;
        user.role = 'MANUFACTURER';
        await user.save();

        console.log('SUCCESS: Admin password reset to: admin123');
    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        await sequelize.close();
    }
}

resetAdmin();
