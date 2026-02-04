const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing UNIQUE constraint on SheetMasters...\n');

db.serialize(() => {
    // SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table

    console.log('Step 1: Creating backup table...');
    db.run(`
        CREATE TABLE SheetMasters_backup AS 
        SELECT * FROM SheetMasters
    `, (err) => {
        if (err) {
            console.error('❌ Error creating backup:', err);
            db.close();
            return;
        }
        console.log('✅ Backup created');

        console.log('Step 2: Dropping old table...');
        db.run('DROP TABLE SheetMasters', (err) => {
            if (err) {
                console.error('❌ Error dropping table:', err);
                db.close();
                return;
            }
            console.log('✅ Old table dropped');

            console.log('Step 3: Creating new table with correct constraint...');
            db.run(`
                CREATE TABLE SheetMasters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    width REAL NOT NULL,
                    height REAL NOT NULL,
                    materialType TEXT NOT NULL DEFAULT 'PVC',
                    isEnabled INTEGER DEFAULT 1,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL,
                    UNIQUE(width, height, materialType)
                )
            `, (err) => {
                if (err) {
                    console.error('❌ Error creating new table:', err);
                    db.close();
                    return;
                }
                console.log('✅ New table created with UNIQUE(width, height, materialType)');

                console.log('Step 4: Restoring data...');
                db.run(`
                    INSERT INTO SheetMasters 
                    SELECT * FROM SheetMasters_backup
                `, (err) => {
                    if (err) {
                        console.error('❌ Error restoring data:', err);
                        db.close();
                        return;
                    }
                    console.log('✅ Data restored');

                    console.log('Step 5: Dropping backup table...');
                    db.run('DROP TABLE SheetMasters_backup', (err) => {
                        if (err) {
                            console.error('❌ Error dropping backup:', err);
                        } else {
                            console.log('✅ Backup table dropped');
                        }

                        // Verify
                        db.all('SELECT * FROM SheetMasters', (err, rows) => {
                            console.log('\n📊 Final Data:');
                            if (rows && rows.length > 0) {
                                console.table(rows);
                            }
                            console.log('\n✨ UNIQUE constraint fixed!');
                            console.log('👉 Now you can add WPC sheets with the same dimensions as PVC sheets');
                            db.close();
                        });
                    });
                });
            });
        });
    });
});
