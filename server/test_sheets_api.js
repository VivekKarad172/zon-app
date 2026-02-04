const { SheetMaster } = require('./models');

async function testSheets() {
    console.log('🧪 Testing Sheet Masters...\n');

    try {
        // Test 1: Raw SQL
        const [results] = await require('./config/database').query(
            'SELECT * FROM SheetMasters WHERE isEnabled = 1'
        );
        console.log('✅ Raw SQL Results:', results.length, 'sheets');
        console.log('Sample:', results.slice(0, 3));

        // Test 2: Sequelize without attributes
        const sheets1 = await SheetMaster.findAll({
            where: { isEnabled: true }
        });
        console.log('\n✅ Sequelize (no attributes):', sheets1.length, 'sheets');
        console.log('Sample:', sheets1.slice(0, 2).map(s => ({
            w: s.width,
            h: s.height,
            mat: s.materialType,
            enabled: s.isEnabled
        })));

        // Test 3: Sequelize with attributes
        const sheets2 = await SheetMaster.findAll({
            attributes: ['id', 'width', 'height', 'materialType', 'isEnabled'],
            where: { isEnabled: true }
        });
        console.log('\n✅ Sequelize (with attributes):', sheets2.length, 'sheets');
        console.log('Sample:', sheets2.slice(0, 2).map(s => ({
            w: s.width,
            h: s.height,
            mat: s.materialType,
            enabled: s.isEnabled
        })));

        // Test 4: Check JSON serialization
        console.log('\n✅ JSON serialization test:');
        console.log(JSON.stringify(sheets2.slice(0, 2)));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

testSheets();
