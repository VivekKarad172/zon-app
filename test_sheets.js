const { SheetMaster } = require('./server/models');

async function testSheets() {
    try {
        const sheets = await SheetMaster.findAll({
            where: { isEnabled: true },
            limit: 3
        });

        console.log('Sample sheet data:');
        sheets.forEach(s => {
            console.log(`${s.width}x${s.height} (${s.materialType}): currentStock=${s.currentStock}, minStock=${s.minStock}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testSheets();
