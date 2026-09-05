const { SheetMaster } = require('./server/models');

async function viewSheets() {
    try {
        const sheets = await SheetMaster.findAll({
            order: [['materialType', 'ASC'], ['width', 'ASC'], ['height', 'ASC']]
        });

        console.log('\n========================================');
        console.log('       CURRENT SHEET INVENTORY');
        console.log('========================================\n');

        if (sheets.length === 0) {
            console.log('No sheet sizes found in database.');
            console.log('You need to add sheet sizes first.');
        } else {
            console.log('ID  | Size      | Material | Current Stock | Min Stock | Status');
            console.log('--------------------------------------------------------------------');

            sheets.forEach(s => {
                const status = s.currentStock <= s.minStock ? '⚠️  LOW' : '✅ GOOD';
                console.log(`${String(s.id).padEnd(3)} | ${String(s.width + ' x ' + s.height).padEnd(9)} | ${s.materialType.padEnd(8)} | ${String(s.currentStock).padEnd(13)} | ${String(s.minStock).padEnd(9)} | ${status}`);
            });
        }

        console.log('\n========================================\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

viewSheets();
