const { User, Color, Size, Design, Order, SheetMaster } = require('./server/models');

async function checkRestored() {
    try {
        const users = await User.count();
        const colors = await Color.count();
        const sizes = await Size.count();
        const designs = await Design.count();
        const orders = await Order.count();

        console.log('=== RESTORED DATABASE STATUS ===');
        console.log(`Users: ${users}`);
        console.log(`Colors: ${colors}`);
        console.log(`Sizes: ${sizes}`);
        console.log(`Designs: ${designs}`);
        console.log(`Orders: ${orders}`);

        // Check if SheetMaster table exists by trying to count
        try {
            const sheets = await SheetMaster.count();
            console.log(`Sheets: ${sheets}`);
        } catch (e) {
            console.log('Sheets: Table does not exist yet (expected in older DB)');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkRestored();
