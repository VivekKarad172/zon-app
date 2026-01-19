const { User } = require('./models');

async function checkShubham() {
    try {
        console.log('--- CHECKING USER shubham ---');
        // Find by name or username
        const users = await User.findAll({
            where: {
                username: 'shubham'
            }
        });

        if (users.length === 0) {
            console.log('No user found with username "shubham". Checking by name...');
            const usersByName = await User.findAll({ where: { name: 'shubham' } });
            if (usersByName.length === 0) {
                console.log('No user found with name "shubham" either.');
                return;
            }
            console.log('Found users by name "shubham":');
            usersByName.forEach(u => console.log(JSON.stringify(u.toJSON(), null, 2)));
            return;
        }

        console.log('Found user(s) with username "shubham":');
        for (const u of users) {
            console.log(`ID: ${u.id}, Role: ${u.role}, Name: ${u.name}`);

            console.log(`Checking dealers for Distributor ID ${u.id}...`);
            const dealers = await User.findAll({
                where: {
                    role: 'DEALER',
                    distributorId: u.id
                }
            });
            console.log(`Found ${dealers.length} dealers for ID ${u.id}:`);
            dealers.forEach(d => console.log(` - ID: ${d.id}, Name: ${d.name}, DistId: ${d.distributorId} (Type: ${typeof d.distributorId})`));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkShubham();
