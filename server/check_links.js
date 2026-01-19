const { User, sequelize } = require('./models');

async function diag() {
    try {
        console.log("--- DB DIAG START ---");

        // 1. Check Database Type & Path
        console.log("Sequelize Config:", JSON.stringify({
            dialect: sequelize.options.dialect,
            storage: sequelize.options.storage
        }, null, 2));

        // 2. Dump all users to see what's actually in there
        const users = await User.findAll();
        console.log(`\nTotal Users in DB: ${users.length}`);

        const tableData = users.map(u => ({
            id: u.id,
            name: u.name,
            role: u.role,
            username: u.username || 'N/A',
            email: u.email || 'N/A',
            distributorId: u.distributorId || 'NULL',
            isEnabled: u.isEnabled
        }));

        console.table(tableData);

        // 3. Check for role case sensitivity or typos
        const roles = [...new Set(users.map(u => u.role))];
        console.log("\nUnique Roles found:", roles);

        // 4. Specifically check for dealers
        const dealers = users.filter(u => u.role === 'DEALER');
        console.log(`DEALER role count: ${dealers.length}`);

        // 5. Check if any dealers belong to the logged in distributor (ID 4 was mentioned before)
        const d4_dealers = dealers.filter(d => d.distributorId == 4);
        console.log(`Dealers with distributorId == 4: ${d4_dealers.length}`);

        console.log("\n--- DB DIAG END ---");
    } catch (e) {
        console.error("\n!!! DIAG FAILED !!!");
        console.error(e);
    } finally {
        process.exit();
    }
}

diag();
