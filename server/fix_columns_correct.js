const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing column order in SheetMasters...\n');

db.serialize(() => {
    console.log('Step 1: Creating backup...');
    db.run(`CREATE TABLE SheetMasters_backup AS SELECT * FROM SheetMasters`, (err) => {
        if (err) {
            console.error('❌ Error:', err);
            db.close();
            return;
        }

        console.log('Step 2: Dropping old table...');
        db.run('DROP TABLE SheetMasters', (err) => {
            if (err) {
                console.error('❌ Error:', err);
                db.close();
                return;
            }

            console.log('Step 3: Creating new table with CORRECT column order...');
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
                    console.error('❌ Error:', err);
                    db.close();
                    return;
                }

                console.log('Step 4: Restoring data with CORRECT mapping...');
                // Map: old updatedAt -> new materialType, old materialType -> new isEnabled
                db.run(`
                    INSERT INTO SheetMasters (id, width, height, materialType, isEnabled, createdAt, updatedAt)
                    SELECT id, width, height, 'PVC', 1, createdAt, updatedAt 
                    FROM SheetMasters_backup
                `, (err) => {
                    if (err) {
                        console.error('❌ Error restoring data:', err);
                        db.close();
                        return;
                    }

                    console.log('✅ Data restored correctly');
                    db.run('DROP TABLE SheetMasters_backup', () => {
                        db.all('SELECT * FROM SheetMasters', (err, rows) => {
                            console.log('\n📊 Corrected Data:');
                            console.table(rows);
                            console.log('\n✨ Fixed! All sheets are now PVC. You can add WPC sheets.');
                            db.close();
                        });
                    });
                });
            });
        });
    });
});
