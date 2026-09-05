const { SheetMaster } = require('./server/models');

async function showAffectedSheets() {
    try {
        const { Op } = require('sequelize');
        const sheets = await SheetMaster.findAll({
            where: { currentStock: { [Op.lt]: 100 } },
            order: [['currentStock', 'ASC']]
        });

        console.log('\n========================================');
        console.log('   SHEETS AFFECTED BY BACKFILL');
        console.log('========================================\n');

        if (sheets.length === 0) {
            console.log('No sheets were deducted (all still at 100)');
        } else {
            console.log('Size      | Material | Stock | Deducted');
            console.log('------------------------------------------');
            sheets.forEach(s => {
                const deducted = 100 - s.currentStock;
                console.log(`${String(s.width + ' x ' + s.height).padEnd(9)} | ${s.materialType.padEnd(8)} | ${String(s.currentStock).padEnd(5)} | -${deducted}`);
            });
        }

        console.log('\n========================================\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

showAffectedSheets();
