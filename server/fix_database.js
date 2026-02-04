const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing SheetMasters table...');

db.serialize(() => {
    // Step 1: Check if materialType column exists
    db.all("PRAGMA table_info(SheetMasters)", (err, columns) => {
        if (err) {
            console.error('Error checking table:', err);
            process.exit(1);
        }

        const hasMaterialType = columns.some(col => col.name === 'materialType');

        if (!hasMaterialType) {
            console.log('📝 Adding materialType column...');

            // Add the column with default value
            db.run("ALTER TABLE SheetMasters ADD COLUMN materialType TEXT DEFAULT 'PVC'", (err) => {
                if (err) {
                    console.error('Error adding column:', err);
                    process.exit(1);
                }
                console.log('✅ materialType column added');

                // Update all existing rows to have PVC
                db.run("UPDATE SheetMasters SET materialType = 'PVC' WHERE materialType IS NULL", (err) => {
                    if (err) {
                        console.error('Error updating rows:', err);
                        process.exit(1);
                    }

                    // Show current data
                    db.all("SELECT * FROM SheetMasters", (err, rows) => {
                        console.log('\n📊 Current Sheet Data:');
                        console.table(rows);
                        console.log('\n✅ Database fixed! Restart your server now.');
                        db.close();
                        process.exit(0);
                    });
                });
            });
        } else {
            console.log('✅ materialType column already exists');
            db.all("SELECT * FROM SheetMasters", (err, rows) => {
                console.log('\n📊 Current Sheet Data:');
                console.table(rows);
                db.close();
                process.exit(0);
            });
        }
    });
});
