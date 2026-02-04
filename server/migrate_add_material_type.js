const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('📂 Database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Could not connect to database:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database');
});

db.serialize(() => {
    // Step 1:  Check if column already exists
    db.all("PRAGMA table_info(SheetMasters)", (err, columns) => {
        if (err) {
            console.error('❌ Error checking table:', err);
            db.close();
            process.exit(1);
        }

        const hasMaterialType = columns.some(col => col.name === 'materialType');

        if (hasMaterialType) {
            console.log('✅ materialType column already exists');
            console.log('📊 Current table structure:');
            console.table(columns);
            db.close();
            process.exit(0);
            return;
        }

        console.log('📝 Adding materialType column...');

        // Step 2: Add column with default
        db.run("ALTER TABLE SheetMasters ADD COLUMN materialType TEXT DEFAULT 'PVC'", (err) => {
            if (err) {
                console.error('❌ Error adding column:', err);
                db.close();
                process.exit(1);
                return;
            }

            console.log('✅ Column added successfully');

            // Step 3: Update all existing rows
            db.run("UPDATE SheetMasters SET materialType = 'PVC' WHERE materialType IS NULL", (err) => {
                if (err) {
                    console.error('❌ Error updating rows:', err);
                    db.close();
                    process.exit(1);
                    return;
                }

                console.log('✅ All existing sheets set to PVC');

                // Step 4: Verify
                db.all("SELECT * FROM SheetMasters", (err, rows) => {
                    if (err) {
                        console.error('❌ Error reading data:', err);
                    } else {
                        console.log('\n📊 Current Sheet Data:');
                        if (rows.length > 0) {
                            console.table(rows);
                        } else {
                            console.log('  (No data)');
                        }
                    }

                    console.log('\n✨ Migration complete!');
                    console.log('👉 Now restart your server');
                    db.close();
                    process.exit(0);
                });
            });
        });
    });
});
