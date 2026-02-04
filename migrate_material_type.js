/**
 * Database Migration Script
 * Adds materialType column to SheetMasters table
 * Run this ONCE after deploying the new code
 */

const sequelize = require('./config/database');
const { SheetMaster } = require('./models');

async function migrateMaterialType() {
    try {
        console.log('🔄 Starting material type migration...');

        // Step 1: Sync database schema (adds materialType column if missing)
        console.log('📊 Syncing database schema...');
        await sequelize.sync({ alter: true });
        console.log('✅ Schema synced');

        // Step 2: Update existing records to PVC (default)
        console.log('📝 Setting existing sheets to PVC material...');
        const [updated] = await SheetMaster.update(
            { materialType: 'PVC' },
            {
                where: { materialType: null },
                silent: true // Don't trigger hooks
            }
        );
        console.log(`✅ Updated ${updated} existing sheet(s) to PVC`);

        // Step 3: Verify
        const totalSheets = await SheetMaster.count();
        const pvcSheets = await SheetMaster.count({ where: { materialType: 'PVC' } });
        const wpcSheets = await SheetMaster.count({ where: { materialType: 'WPC' } });

        console.log('\n📊 Migration Summary:');
        console.log(`   Total Sheets: ${totalSheets}`);
        console.log(`   PVC Sheets: ${pvcSheets}`);
        console.log(`   WPC Sheets: ${wpcSheets}`);
        console.log('\n✨ Migration complete!');

        console.log('\n💡 Next Steps:');
        console.log('   1. You can now add WPC sheet sizes via the Admin Dashboard');
        console.log('   2. Workers will automatically see WPC sheets for WPC designs');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateMaterialType();
