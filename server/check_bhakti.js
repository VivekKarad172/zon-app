const { User } = require('./models');

async function checkBhakti() {
    try {
        console.log('--- CHECKING USER bhaktidevi ---');
        // Find by name or username
        const users = await User.findAll({
            where: {
                username: 'bhaktidevi'
            }
        });

        if (users.length === 0) {
            console.log('No user found with username "bhaktidevi". Checking by name...');
            const usersByName = await User.findAll({ where: { name: 'bhaktidevi' } });
            if (usersByName.length === 0) {
                console.log('No user found with name "bhaktidevi" either.');
                return;
            }
            // Be careful if multiple
            usersByName.forEach(u => console.log('Found by name:', JSON.stringify(u.toJSON(), null, 2)));
            // Use the first one
            checkDealers(usersByName[0]);
            return;
        }

        console.log('Found user(s) with username "bhaktidevi":');
        for (const u of users) {
            checkDealers(u);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

async function checkDealers(u) {
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

    // Also check for loose matches if 0 found
    if (dealers.length === 0) {
        console.log('--- DEEP SEARCH FOR LOOSE MATCHES ---');
        const allDealers = await User.findAll({ where: { role: 'DEALER' } });
        const looseMatches = allDealers.filter(d => d.distributorId == u.id);
        console.log(`Found ${looseMatches.length} dealers using == comparison:`);
        looseMatches.forEach(d => console.log(` - ID: ${d.id}, DistId: ${d.distributorId} (Type: ${typeof d.distributorId})`));
    }
}

checkBhakti();
