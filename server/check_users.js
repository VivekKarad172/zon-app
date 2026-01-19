const { User } = require('./models');

async function checkUsers() {
    try {
        const users = await User.findAll();
        console.log('--- USERS IN DB ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}, Username: ${u.username}, Role: ${u.role}`);
        });
        console.log('-------------------');
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

checkUsers();
